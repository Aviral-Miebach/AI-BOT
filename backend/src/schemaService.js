const CACHE_TTL_MS = 60_000;
let schemaCache = { text: "", tables: [], tableMap: new Map(), columnMap: new Map(), expiresAt: 0 };

function quoteIdentifier(name) {
  return `"${String(name).replace(/"/g, "\"\"")}"`;
}

export async function loadSchemaInfo(pool) {
  const now = Date.now();
  if (schemaCache.text && now < schemaCache.expiresAt) {
    return schemaCache;
  }

  const result = await pool.query(`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name, ordinal_position
  `);

  const byTable = new Map();
  for (const row of result.rows) {
    const fqtn = `${row.table_schema}.${row.table_name}`.toLowerCase();
    const tableLabel = `${quoteIdentifier(row.table_schema)}.${quoteIdentifier(row.table_name)}`;
    const col = `${quoteIdentifier(row.column_name)} (${row.data_type})`;
    if (!byTable.has(fqtn)) {
      byTable.set(fqtn, { tableLabel, columns: [] });
    }
    byTable.get(fqtn).columns.push(col);
  }

  const lines = [];
  const tables = [];
  const tableMap = new Map();
  const columnMap = new Map();
  for (const [fqtn, info] of byTable.entries()) {
    lines.push(`${info.tableLabel}: ${info.columns.join(", ")}`);
    tables.push(fqtn);
    tableMap.set(fqtn, info.tableLabel);

    const colLookup = new Map();
    for (const raw of info.columns) {
      const col = raw.split(" (")[0];
      colLookup.set(col.replace(/"/g, "").toLowerCase(), col);
    }
    columnMap.set(fqtn, colLookup);
  }

  schemaCache = {
    text: lines.join("\n"),
    tables,
    tableMap,
    columnMap,
    expiresAt: now + CACHE_TTL_MS
  };
  return schemaCache;
}

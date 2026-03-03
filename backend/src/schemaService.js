import { config } from "./config.js";

const CACHE_TTL_MS = 60_000;
let schemaCache = { text: "", rulesText: "", tables: [], tableMap: new Map(), columnMap: new Map(), expiresAt: 0 };

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

  const keyConstraintsResult = await pool.query(`
    SELECT
      tc.constraint_type,
      tc.constraint_name,
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      kcu.ordinal_position,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
    ORDER BY tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position
  `);

  const checkConstraintsResult = await pool.query(`
    SELECT
      ns.nspname AS table_schema,
      cls.relname AS table_name,
      con.conname AS constraint_name,
      pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    WHERE con.contype = 'c'
      AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY ns.nspname, cls.relname, con.conname
  `);

  const constraintMap = new Map();
  for (const row of keyConstraintsResult.rows) {
    const key = `${row.table_schema}.${row.table_name}.${row.constraint_name}`;
    if (!constraintMap.has(key)) {
      constraintMap.set(key, {
        constraintType: row.constraint_type,
        tableSchema: row.table_schema,
        tableName: row.table_name,
        foreignTableSchema: row.foreign_table_schema,
        foreignTableName: row.foreign_table_name,
        columns: [],
        foreignColumns: []
      });
    }
    const entry = constraintMap.get(key);
    if (row.column_name) entry.columns.push(row.column_name);
    if (row.foreign_column_name) entry.foreignColumns.push(row.foreign_column_name);
  }

  const rules = [];
  for (const entry of constraintMap.values()) {
    const localTable = `${quoteIdentifier(entry.tableSchema)}.${quoteIdentifier(entry.tableName)}`;
    const localColumns = entry.columns.map((name) => quoteIdentifier(name)).join(", ");
    if (entry.constraintType === "FOREIGN KEY" && entry.foreignTableSchema && entry.foreignTableName) {
      const foreignTable = `${quoteIdentifier(entry.foreignTableSchema)}.${quoteIdentifier(entry.foreignTableName)}`;
      const foreignColumns = entry.foreignColumns.map((name) => quoteIdentifier(name)).join(", ");
      rules.push(`FOREIGN KEY ${localTable} (${localColumns}) -> ${foreignTable} (${foreignColumns})`);
      continue;
    }
    rules.push(`${entry.constraintType} ${localTable} (${localColumns})`);
  }

  for (const row of checkConstraintsResult.rows) {
    const tableRef = `${quoteIdentifier(row.table_schema)}.${quoteIdentifier(row.table_name)}`;
    const definition = String(row.definition || "").replace(/\s+/g, " ").trim();
    rules.push(`CHECK ${tableRef}: ${definition}`);
  }

  const maxRuleLines = Math.max(1, Number(config.schemaRulesMaxLines || 400));
  const rulesText = rules.slice(0, maxRuleLines).join("\n");

  schemaCache = {
    text: lines.join("\n"),
    rulesText,
    tables,
    tableMap,
    columnMap,
    expiresAt: now + CACHE_TTL_MS
  };
  return schemaCache;
}

import { config } from "./config.js";

const RETRYABLE_DB_ERROR_CODES = new Set(["42P01", "42703", "42601", "42883", "42P10", "42804"]);
const LOOKUP_TEXT_COLUMN_RE = /(title|name|country|state|city|code|desc|description|type|category|label|key|value)/i;
const AGGREGATE_QUESTION_RE = /\b(total|sum|count|avg|average|min|max|per|group\s+by|trend|manifest)\b/i;
const METRIC_COLUMN_RE = /(total|sum|qty|quantity|amount|count|value|ship|pick|load|cord)/i;
const QUESTION_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "by",
  "for",
  "from",
  "in",
  "is",
  "me",
  "of",
  "on",
  "please",
  "show",
  "table",
  "the",
  "to",
  "what",
  "which"
]);

let heuristicSchemaCache = {
  expiresAt: 0,
  tables: []
};

function quoteIdentifier(name) {
  return `"${String(name).replace(/"/g, "\"\"")}"`;
}

function tokenizeQuestion(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .filter((token) => token && token.length > 1 && !QUESTION_STOP_WORDS.has(token));
}

function isNullLike(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "" || normalized === "null" || normalized === "nan" || normalized === "n/a" || normalized === "-";
}

function toFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized || isNullLike(normalized)) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function detectMetricColumns(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const keys = Object.keys(rows[0] || {});
  let metrics = keys.filter((key) => METRIC_COLUMN_RE.test(key));
  if (metrics.length > 0) return metrics;
  metrics = keys.filter((key) => rows.some((row) => toFiniteNumber(row[key]) !== null));
  return metrics.slice(0, 8);
}

function cleanLookupToken(value) {
  return String(value || "")
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .trim();
}

function normalizeNameToken(value) {
  return cleanLookupToken(value).toLowerCase();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function questionMentionsKnownTable(question, tables) {
  const q = String(question || "").toLowerCase();
  if (!q) return false;

  for (const table of tables || []) {
    const tableName = String(table?.tableName || "").toLowerCase();
    if (!tableName || tableName.length < 3) continue;
    const re = new RegExp(`\\b${escapeRegex(tableName)}\\b`, "i");
    if (re.test(q)) return true;
  }
  return false;
}

function parseColumnEntityQuestion(question) {
  const cleaned = String(question || "").trim().replace(/[?]+$/, "");
  if (!cleaned) return null;

  const patterns = [
    /\b(?:what\s+is\s+the\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:for|of)\s+(.+)$/i,
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*(.+)$/i
  ];

  let match = null;
  for (const pattern of patterns) {
    const candidate = cleaned.match(pattern);
    if (candidate) {
      match = candidate;
      break;
    }
  }
  if (!match) return null;

  const targetColumn = String(match[1] || "").trim().toLowerCase();
  let entityValue = String(match[2] || "").trim();
  entityValue = entityValue.replace(/\b(?:in|from)\s+[a-zA-Z_][a-zA-Z0-9_]*(?:\s+table)?$/i, "").trim();
  entityValue = entityValue.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\s+me$/i, "").trim();
  entityValue = entityValue.replace(/^['"]|['"]$/g, "").trim();
  if (!targetColumn || entityValue.length < 2) return null;
  if (entityValue.split(/\s+/).length > 8) return null;
  return { targetColumn, entityValue };
}

function parseStatusStateCountQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return null;
  const lower = q.toLowerCase();
  const asksCount = /\b(kitne|count|how\s+many|number\s+of|total)\b/i.test(lower);
  const mentionsStatus = /\bstatus\b/i.test(lower);
  const mentionsCompleted = /\b(completed|complete|done|finished|ho gaya|ho gya|ho gayi|ho gye)\b/i.test(lower);
  const mentionsInProgress =
    /\b(in\s*progress|inprogress|progress|pending|wip|under\s*process|chal\s*raha)\b/i.test(lower);
  if (!(asksCount && mentionsStatus && (mentionsCompleted || mentionsInProgress))) return null;

  const patterns = [
    /`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+(?:me|mein|mai)\b/i,
    /\b(?:in|from)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\b/i,
    /^`?([a-zA-Z_][a-zA-Z0-9_]*)`?\b/i
  ];

  for (const pattern of patterns) {
    const match = q.match(pattern);
    if (match) {
      return { tableName: cleanLookupToken(match[1]), state: mentionsInProgress ? "in_progress" : "completed" };
    }
  }
  return null;
}

function parseExplicitTableLookupQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return null;

  const hindiStyle = q.match(
    /`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+me\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+([a-zA-Z0-9_.-]+)\s+(?:ka|ki|ke)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i
  );
  if (hindiStyle) {
    return {
      tableName: cleanLookupToken(hindiStyle[1]),
      filterColumn: cleanLookupToken(hindiStyle[2]),
      filterValue: cleanLookupToken(hindiStyle[3]),
      targetColumn: cleanLookupToken(hindiStyle[4])
    };
  }

  const englishStyle = q.match(
    /(?:give|show|get|find|what\s+is(?:\s+the)?)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+(?:of|for)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+([a-zA-Z0-9_.-]+)\s+(?:in|from)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i
  );
  if (englishStyle) {
    return {
      tableName: cleanLookupToken(englishStyle[4]),
      filterColumn: cleanLookupToken(englishStyle[2]),
      filterValue: cleanLookupToken(englishStyle[3]),
      targetColumn: cleanLookupToken(englishStyle[1])
    };
  }

  // Example: "setid for id 951 in ctlbrd01"
  const directStyle = q.match(
    /`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+(?:of|for)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+([a-zA-Z0-9_.-]+)\s+(?:in|from)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i
  );
  if (directStyle) {
    return {
      tableName: cleanLookupToken(directStyle[4]),
      filterColumn: cleanLookupToken(directStyle[2]),
      filterValue: cleanLookupToken(directStyle[3]),
      targetColumn: cleanLookupToken(directStyle[1])
    };
  }

  // Example: "in ctlbrd01 id 951 setid"
  const compactStyle = q.match(
    /\b(?:in|from)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+([a-zA-Z0-9_.-]+)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i
  );
  if (compactStyle) {
    return {
      tableName: cleanLookupToken(compactStyle[1]),
      filterColumn: cleanLookupToken(compactStyle[2]),
      filterValue: cleanLookupToken(compactStyle[3]),
      targetColumn: cleanLookupToken(compactStyle[4])
    };
  }
  return null;
}


function buildGapLikePattern(value) {
  const compact = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "");
  if (compact.length < 3) return "";
  return `%${compact.split("").join("%")}%`;
}

function extractPrimaryTableFromSql(sql) {
  const text = String(sql || "");
  if (!text) return null;

  const match = text.match(
    /\bfrom\s+(?:(?:"([^"]+)")\.(?:"([^"]+)")|([a-zA-Z_][\w$]*)\.([a-zA-Z_][\w$]*)|"([^"]+)"|([a-zA-Z_][\w$]*))/i
  );
  if (!match) return null;
  if (match[1] && match[2]) return { schema: match[1], table: match[2] };
  if (match[3] && match[4]) return { schema: match[3], table: match[4] };
  if (match[5]) return { schema: "public", table: match[5] };
  if (match[6]) return { schema: "public", table: match[6] };
  return null;
}

function getStatusColumnKey(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const keys = Object.keys(rows[0] || {});
  return keys.find((key) => String(key || "").toLowerCase() === "status") || null;
}

function toStatusNumber(value) {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function almostEqual(a, b) {
  if (a === null || b === null || a === undefined || b === undefined) return false;
  return Math.abs(Number(a) - Number(b)) < 1e-9;
}

function deriveStatusThresholdsFromRows(rows, statusKey) {
  const unique = Array.from(
    new Set((rows || []).map((row) => toStatusNumber(row?.[statusKey])).filter((value) => value !== null))
  ).sort((a, b) => b - a);
  if (unique.length === 0) return null;
  return { done: unique[0], inProgress: unique.length > 1 ? unique[1] : null };
}

function appendProcessStateFromThresholds(rows, statusKey, thresholds) {
  if (!thresholds || thresholds.done === null || thresholds.done === undefined) return rows;
  return (rows || []).map((row) => {
    const statusNum = toStatusNumber(row?.[statusKey]);
    if (statusNum === null) return { ...row, PROCESS_STATE: "UNKNOWN" };
    let state = "IN_PROGRESS";
    if (almostEqual(statusNum, thresholds.done)) state = "DONE";
    else if (thresholds.inProgress !== null && almostEqual(statusNum, thresholds.inProgress)) state = "IN_PROGRESS";
    else if (statusNum > thresholds.done) state = "UNKNOWN";
    return { ...row, PROCESS_STATE: state };
  });
}

function buildMultiTableLookupAnswer({ rows, targetColumn, entityValue }) {
  const tableNames = Array.from(new Set((rows || []).map((row) => String(row.table_name || "")))).filter(Boolean);
  const tableCount = tableNames.length;
  if (tableCount === 0) return "No data found.";
  const header = `Found ${targetColumn.toUpperCase()} for '${entityValue}' in ${tableCount} table(s).`;
  const preview = rows
    .slice(0, 6)
    .map((row, index) => `${index + 1}. ${row.table_name}: ${row.target_value}`)
    .join("\n");
  return preview ? `${header}\n${preview}` : header;
}

function scoreLookupCandidate({ table, targetColumn, questionTokens }) {
  const hasTarget = table.columns.some((column) => column.lowerName === targetColumn);
  if (!hasTarget) return -1;
  let score = 20;
  if (table.columns.some((column) => ["title", "name", "country", "code", "description", "desc"].includes(column.lowerName))) {
    score += 8;
  }
  if (/country|state|city|region|customer|user|client/.test(table.lowerTableName)) score += 3;
  for (const token of questionTokens) {
    if (table.lowerTableName.includes(token)) score += 1;
  }
  return score;
}

function pickLookupColumns(table, targetColumn) {
  const preferred = table.columns.filter(
    (column) => column.lowerName !== targetColumn && LOOKUP_TEXT_COLUMN_RE.test(column.name)
  );
  if (preferred.length > 0) return preferred.slice(0, 4);
  const fallback = table.columns.filter((column) => column.lowerName !== targetColumn);
  return fallback.slice(0, 3);
}

function findTableFromSchemaTables(tables, tableNameToken) {
  const token = normalizeNameToken(tableNameToken);
  if (!token) return null;
  if (token.includes(".")) {
    const [schema, table] = token.split(".");
    return (
      tables.find(
        (entry) =>
          String(entry.tableSchema || "").toLowerCase() === schema &&
          String(entry.tableName || "").toLowerCase() === table
      ) || null
    );
  }
  return tables.find((entry) => String(entry.tableName || "").toLowerCase() === token) || null;
}

function findColumnInTable(table, columnToken) {
  const token = normalizeNameToken(columnToken);
  if (!token) return null;
  return table.columns.find((column) => String(column.lowerName || "").toLowerCase() === token) || null;
}

export function isRetryableDbError(dbError) {
  const code = String(dbError?.code || "").trim();
  const message = String(dbError?.message || "").toLowerCase();
  if (RETRYABLE_DB_ERROR_CODES.has(code)) return true;
  if (code.startsWith("42")) return true;
  return /syntax error|does not exist|undefined column|undefined table|operator does not exist|function .* does not exist|invalid input syntax/i.test(
    message
  );
}

export function evaluateResultQuality(question, result) {
  if (!result || !Array.isArray(result.rows) || result.rowCount === 0 || result.rows.length === 0) {
    return { status: "empty", score: 0, reason: "no_rows", metrics: [], completeness: 0 };
  }

  const rows = result.rows.slice(0, 120);
  const keys = Object.keys(rows[0] || {});
  if (keys.length === 0) {
    return { status: "empty", score: 0, reason: "no_columns", metrics: [], completeness: 0 };
  }

  const totalCells = rows.length * keys.length;
  const filledCells = rows.reduce(
    (count, row) => count + keys.reduce((acc, key) => acc + (isNullLike(row[key]) ? 0 : 1), 0),
    0
  );
  const density = totalCells > 0 ? filledCells / totalCells : 0;
  let score = Math.min(result.rowCount, 200) + Math.round(density * 100);

  const aggregateQuestion = AGGREGATE_QUESTION_RE.test(String(question || ""));
  const metrics = aggregateQuestion ? detectMetricColumns(rows) : [];
  let completeness = 1;
  if (aggregateQuestion && metrics.length > 0) {
    const usefulRows = rows.filter((row) => metrics.some((metric) => !isNullLike(row[metric])));
    completeness = usefulRows.length / rows.length;
    score += Math.round(completeness * 140);
  }

  if (aggregateQuestion && metrics.length > 0 && rows.length >= 5 && completeness < 0.4) {
    return { status: "low_quality", score, reason: "mostly_null_metrics", metrics, completeness };
  }
  return { status: "good", score, reason: "ok", metrics, completeness };
}

export function buildSqlRetryHint({ generatedSql, dbError, quality }) {
  if (dbError) {
    return (
      `Previous SQL failed with database error (${dbError.code || "unknown"}): ${dbError.message}\n` +
      "Fix table/column names, joins, types, and SQL syntax using current schema only.\n" +
      `Previous SQL:\n${generatedSql || ""}`
    );
  }
  if (!quality || quality.status === "good") return "";
  if (quality.status === "empty") {
    return (
      "Previous SQL returned 0 rows. Re-check table/column mapping and relax overly strict filters.\n" +
      "If question implies join, use a valid common business key from schema.\n" +
      `Previous SQL:\n${generatedSql || ""}`
    );
  }
  if (quality.status === "low_quality") {
    const metricText =
      Array.isArray(quality.metrics) && quality.metrics.length > 0
        ? `Metric columns seen: ${quality.metrics.join(", ")}. `
        : "";
    const nullPercent = Math.round((1 - (quality.completeness || 0)) * 100);
    return (
      `Previous SQL produced low-quality aggregates (${nullPercent}% rows had null metrics). ` +
      metricText +
      "Use COALESCE(SUM(metric),0), aggregate from the correct source table, and avoid over-restrictive join predicates.\n" +
      `Previous SQL:\n${generatedSql || ""}`
    );
  }
  return "";
}

export async function getHeuristicSchemaTables(pool) {
  const now = Date.now();
  if (heuristicSchemaCache.tables.length > 0 && now < heuristicSchemaCache.expiresAt) {
    return heuristicSchemaCache.tables;
  }

  const result = await pool.query(`
    SELECT table_schema, table_name, column_name, data_type, ordinal_position
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name, ordinal_position
  `);

  const tableMap = new Map();
  for (const row of result.rows) {
    const key = `${row.table_schema}.${row.table_name}`.toLowerCase();
    if (!tableMap.has(key)) {
      tableMap.set(key, {
        tableSchema: row.table_schema,
        tableName: row.table_name,
        lowerTableName: String(row.table_name || "").toLowerCase(),
        columns: []
      });
    }
    tableMap.get(key).columns.push({
      name: row.column_name,
      lowerName: String(row.column_name || "").toLowerCase(),
      dataType: String(row.data_type || "").toLowerCase()
    });
  }

  const tables = Array.from(tableMap.values());
  heuristicSchemaCache = {
    tables,
    expiresAt: now + config.heuristicSchemaCacheTtlMs
  };
  return tables;
}

export async function tryStatusStateCountLookup(pool, question) {
  const parsed = parseStatusStateCountQuestion(question);
  if (!parsed?.tableName || !parsed?.state) return null;
  const tables = await getHeuristicSchemaTables(pool);
  const table = findTableFromSchemaTables(tables, parsed.tableName);
  if (!table) return null;

  const statusColumn = table.columns.find((column) => String(column.lowerName || "").toLowerCase() === "status");
  if (!statusColumn) return null;

  const tableRef = `${quoteIdentifier(table.tableSchema)}.${quoteIdentifier(table.tableName)}`;
  const statusRef = quoteIdentifier(statusColumn.name);
  const sql =
    parsed.state === "in_progress"
      ? `
    WITH max_status AS (
      SELECT MAX(NULLIF(regexp_replace(cast(${statusRef} as text), '[^0-9.-]', '', 'g'), '')::numeric) AS done_status
      FROM ${tableRef}
      WHERE ${statusRef} IS NOT NULL
    )
    SELECT
      (SELECT done_status FROM max_status) AS done_status,
      COUNT(*)::bigint AS in_progress_count
    FROM (
      SELECT NULLIF(regexp_replace(cast(${statusRef} as text), '[^0-9.-]', '', 'g'), '')::numeric AS status_num
      FROM ${tableRef}
      WHERE ${statusRef} IS NOT NULL
    ) t
    WHERE t.status_num IS NOT NULL
      AND t.status_num <> (SELECT done_status FROM max_status)
  `
      : `
    WITH max_status AS (
      SELECT MAX(NULLIF(regexp_replace(cast(${statusRef} as text), '[^0-9.-]', '', 'g'), '')::numeric) AS done_status
      FROM ${tableRef}
      WHERE ${statusRef} IS NOT NULL
    )
    SELECT
      (SELECT done_status FROM max_status) AS done_status,
      COUNT(*)::bigint AS completed_count
    FROM ${tableRef}
    WHERE NULLIF(regexp_replace(cast(${statusRef} as text), '[^0-9.-]', '', 'g'), '')::numeric =
          (SELECT done_status FROM max_status)
  `;
  const result = await pool.query(sql);
  const row = result.rows?.[0] || {};
  const doneStatus = row.done_status;
  const completedCount = Number(row.completed_count || 0);
  const inProgressCount = Number(row.in_progress_count || 0);
  const answer =
    doneStatus === null || doneStatus === undefined
      ? `${table.tableName} table me numeric STATUS value nahi mili.`
      : parsed.state === "in_progress"
        ? `${table.tableName} me DONE STATUS value ${doneStatus} hai, aur ${inProgressCount} row(s) IN_PROGRESS hain.`
        : `${table.tableName} me completed STATUS value ${doneStatus} hai, aur ${completedCount} row(s) completed hain.`;

  return {
    sql: String(sql).trim(),
    params: [],
    explanation: `Status state lookup in ${tableRef}`,
    answer,
    result: { rowCount: result.rowCount, rows: result.rows }
  };
}

export async function tryExplicitTableLookup(pool, question) {
  const parsed = parseExplicitTableLookupQuestion(question);
  if (!parsed || !parsed.filterValue || parsed.filterValue.length > 64) return null;

  const tables = await getHeuristicSchemaTables(pool);
  const table = findTableFromSchemaTables(tables, parsed.tableName);
  if (!table) return null;
  const filterCol = findColumnInTable(table, parsed.filterColumn);
  const targetCol = findColumnInTable(table, parsed.targetColumn);
  if (!filterCol || !targetCol) return null;

  const tableRef = `${quoteIdentifier(table.tableSchema)}.${quoteIdentifier(table.tableName)}`;
  const filterRef = quoteIdentifier(filterCol.name);
  const targetRef = quoteIdentifier(targetCol.name);
  const baseSelect = `SELECT ${filterRef} AS ${quoteIdentifier(filterCol.name)}, ${targetRef} AS ${quoteIdentifier(targetCol.name)} FROM ${tableRef}`;

  const exactSql = `${baseSelect} WHERE lower(cast(${filterRef} as text)) = lower($1) LIMIT 5`;
  const exactResult = await pool.query(exactSql, [parsed.filterValue]);
  if (exactResult.rowCount > 0) {
    return { sql: exactSql, params: [parsed.filterValue], explanation: `Exact lookup in ${tableRef}`, result: exactResult };
  }

  const containsValue = `%${parsed.filterValue}%`;
  const containsSql = `${baseSelect} WHERE lower(cast(${filterRef} as text)) LIKE lower($1) LIMIT 5`;
  const containsResult = await pool.query(containsSql, [containsValue]);
  if (containsResult.rowCount > 0) {
    return { sql: containsSql, params: [containsValue], explanation: `Partial lookup in ${tableRef}`, result: containsResult };
  }

  const gapPattern = buildGapLikePattern(parsed.filterValue);
  if (gapPattern) {
    const gapSql = `${baseSelect} WHERE lower(cast(${filterRef} as text)) LIKE lower($1) LIMIT 5`;
    const gapResult = await pool.query(gapSql, [gapPattern]);
    if (gapResult.rowCount > 0) {
      return { sql: gapSql, params: [gapPattern], explanation: `Typo-tolerant lookup in ${tableRef}`, result: gapResult };
    }
  }
  return null;
}

export async function tryAmbiguousMultiTableLookup(pool, question) {
  const parsed = parseColumnEntityQuestion(question);
  if (!parsed) return null;
  const { targetColumn, entityValue } = parsed;
  const tables = await getHeuristicSchemaTables(pool);
  if (!tables || tables.length === 0) return null;
  if (parseExplicitTableLookupQuestion(question)) return null;
  if (questionMentionsKnownTable(question, tables)) return null;

  const tablesWithTarget = tables.filter((table) =>
    table.columns.some((column) => String(column.lowerName || "").toLowerCase() === targetColumn)
  );
  if (tablesWithTarget.length < 2) return null;

  const questionTokens = tokenizeQuestion(question);
  const candidates = tablesWithTarget
    .map((table) => ({ table, score: scoreLookupCandidate({ table, targetColumn, questionTokens }) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, config.maxMultiTableLookupTables);

  const rows = [];
  let scanned = 0;
  for (const { table } of candidates) {
    scanned += 1;
    const target = table.columns.find((column) => column.lowerName === targetColumn);
    if (!target) continue;
    const lookupColumns = pickLookupColumns(table, targetColumn);
    if (lookupColumns.length === 0) continue;

    const tableRef = `${quoteIdentifier(table.tableSchema)}.${quoteIdentifier(table.tableName)}`;
    const targetRef = quoteIdentifier(target.name);
    const firstLookupRef = quoteIdentifier(lookupColumns[0].name);
    const baseSelect = `SELECT cast(${firstLookupRef} as text) AS match_value, cast(${targetRef} as text) AS target_value FROM ${tableRef}`;
    const exactWhere = lookupColumns
      .map((column) => `lower(cast(${quoteIdentifier(column.name)} as text)) = lower($1)`)
      .join(" OR ");
    const exactSql = `${baseSelect} WHERE (${exactWhere}) LIMIT ${config.maxRowsPerTableLookup}`;
    const exactResult = await pool.query(exactSql, [entityValue]);
    if (exactResult.rowCount > 0) {
      rows.push(
        ...exactResult.rows.map((row) => ({
          table_name: `${table.tableSchema}.${table.tableName}`,
          target_column: target.name,
          match_value: row.match_value,
          target_value: row.target_value,
          match_type: "exact"
        }))
      );
      continue;
    }

    const containsWhere = lookupColumns
      .map((column) => `lower(cast(${quoteIdentifier(column.name)} as text)) LIKE lower($1)`)
      .join(" OR ");
    const containsSql = `${baseSelect} WHERE (${containsWhere}) LIMIT ${config.maxRowsPerTableLookup}`;
    const containsResult = await pool.query(containsSql, [`%${entityValue}%`]);
    if (containsResult.rowCount > 0) {
      rows.push(
        ...containsResult.rows.map((row) => ({
          table_name: `${table.tableSchema}.${table.tableName}`,
          target_column: target.name,
          match_value: row.match_value,
          target_value: row.target_value,
          match_type: "partial"
        }))
      );
      continue;
    }

    const gapPattern = buildGapLikePattern(entityValue);
    if (!gapPattern) continue;
    const fuzzySql = `${baseSelect} WHERE (${containsWhere}) LIMIT ${config.maxRowsPerTableLookup}`;
    const fuzzyResult = await pool.query(fuzzySql, [gapPattern]);
    if (fuzzyResult.rowCount > 0) {
      rows.push(
        ...fuzzyResult.rows.map((row) => ({
          table_name: `${table.tableSchema}.${table.tableName}`,
          target_column: target.name,
          match_value: row.match_value,
          target_value: row.target_value,
          match_type: "fuzzy"
        }))
      );
    }
  }

  if (rows.length === 0) return null;
  rows.sort((a, b) => String(a.table_name).localeCompare(String(b.table_name)) || String(a.match_value).localeCompare(String(b.match_value)));
  const safeEntityValue = String(entityValue || "").replace(/'/g, "''");
  const sqlSummary =
    `HEURISTIC_MULTI_TABLE_LOOKUP(column=${targetColumn}, value='${safeEntityValue}', ` +
    `candidate_tables=${tablesWithTarget.length}, scanned=${scanned})`;
  return {
    sql: sqlSummary,
    params: [],
    explanation: `Multi-table lookup across ${tablesWithTarget.length} tables having column '${targetColumn}'`,
    answer: buildMultiTableLookupAnswer({ rows, targetColumn, entityValue }),
    result: { rowCount: rows.length, rows }
  };
}

export async function tryEntityLookupWithoutTable(pool, question) {
  const parsed = parseColumnEntityQuestion(question);
  if (!parsed) return null;
  const { targetColumn, entityValue } = parsed;
  const questionTokens = tokenizeQuestion(question);
  const tables = await getHeuristicSchemaTables(pool);

  const candidates = tables
    .map((table) => ({ table, score: scoreLookupCandidate({ table, targetColumn, questionTokens }) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  for (const { table } of candidates) {
    const target = table.columns.find((column) => column.lowerName === targetColumn);
    if (!target) continue;
    const lookupColumns = pickLookupColumns(table, targetColumn);
    if (lookupColumns.length === 0) continue;
    const tableRef = `${quoteIdentifier(table.tableSchema)}.${quoteIdentifier(table.tableName)}`;
    const targetRef = quoteIdentifier(target.name);
    const firstLookupRef = quoteIdentifier(lookupColumns[0].name);
    const exactWhere = lookupColumns
      .map((column) => `lower(cast(${quoteIdentifier(column.name)} as text)) = lower($1)`)
      .join(" OR ");
    const exactSql = `SELECT ${firstLookupRef} AS title, ${targetRef} AS ${targetRef} FROM ${tableRef} WHERE (${exactWhere}) LIMIT 5`;

    try {
      const exactResult = await pool.query(exactSql, [entityValue]);
      if (exactResult.rowCount > 0) {
        return { sql: exactSql, params: [entityValue], explanation: `Heuristic lookup in ${tableRef} by ${targetColumn}`, result: exactResult };
      }
      const likeWhere = lookupColumns
        .map((column) => `lower(cast(${quoteIdentifier(column.name)} as text)) LIKE lower($1)`)
        .join(" OR ");
      const likeSql = `SELECT ${firstLookupRef} AS title, ${targetRef} AS ${targetRef} FROM ${tableRef} WHERE (${likeWhere}) LIMIT 5`;
      const likeResult = await pool.query(likeSql, [`%${entityValue}%`]);
      if (likeResult.rowCount > 0) {
        return {
          sql: likeSql,
          params: [`%${entityValue}%`],
          explanation: `Heuristic partial lookup in ${tableRef} by ${targetColumn}`,
          result: likeResult
        };
      }
    } catch {
      // Skip tables that fail in heuristic mode.
    }
  }
  return null;
}

export async function tryFastKpiLookup(pool, question) {
  const q = String(question || "").trim().toLowerCase();
  if (!q) return null;

  const asksCount = /\b(how\s*many|howmany|count|number\s+of|total)\b/.test(q);
  const asksHowMuch = /\b(how\s*much|howmuch)\b/.test(q);
  const mentionsToday = /\b(today|todays|current\s+day)\b/.test(q);
  const mentionsThisMonth = /\b(this\s+month|current\s+month)\b/.test(q);

  if (
    asksCount &&
    /\b(stock\s*transfer|sti|stn)\b/.test(q) &&
    /\b(receipt|receipts)\b/.test(q)
  ) {
    const sql = mentionsThisMonth
      ? `
      SELECT COUNT(DISTINCT "STINUM")::bigint AS value
      FROM public."RPT_IBCTDETL01"
      WHERE "TRANDATE" >= date_trunc('month', current_date)::date
        AND "TRANDATE" < (date_trunc('month', current_date) + interval '1 month')::date
    `
      : `
      SELECT COUNT(DISTINCT "STINUM")::bigint AS value
      FROM public."RPT_IBCTDETL01"
      WHERE "TRANDATE" = current_date
    `;
    const result = await pool.query(sql);
    const value = Number(result.rows?.[0]?.value || 0);
    const period = mentionsThisMonth ? "this month" : mentionsToday ? "today" : "today";
    return {
      sql: String(sql).trim(),
      params: [],
      answer: `There were ${value} stock transfer receipts done ${period}.`,
      explanation: "Fast KPI lookup: stock transfer receipts",
      result: { rowCount: result.rowCount, rows: result.rows }
    };
  }

  if (
    (asksCount || asksHowMuch) &&
    /\b(quantity|qty)\b/.test(q) &&
    /\b(received|receive)\b/.test(q) &&
    mentionsToday
  ) {
    const sql = `
      SELECT COALESCE(SUM("RCVDQTY"), 0) AS value
      FROM public."RPT_IBCTDETL01"
      WHERE "TRANDATE" = current_date
    `;
    const result = await pool.query(sql);
    const value = Number(result.rows?.[0]?.value || 0);
    return {
      sql: String(sql).trim(),
      params: [],
      answer: `The quantity received today is ${value}.`,
      explanation: "Fast KPI lookup: quantity received today",
      result: { rowCount: result.rowCount, rows: result.rows }
    };
  }

  return null;
}

export async function tryWarehouseLocationLookup(pool, question) {
  const q = String(question || "").trim();
  if (!q) return null;

  const match = q.match(/\bwhere\s+is\s+(.+?)\s+warehouse\s+located\b/i);
  if (!match) return null;
  const warehouse = cleanLookupToken(match[1]);
  if (!warehouse || warehouse.length < 2 || warehouse.length > 64) return null;

  const sql = `
    SELECT "WHSENAME", "WHSEADDR1", "WHSEADDR2", "WHSEADDR3", "CITY", "STATE", "PINCD", "COUNTRY"
    FROM public."WHSEMST00"
    WHERE "WHSENAME" ILIKE $1
    LIMIT 100
  `;
  const params = [`%${warehouse}%`];
  const result = await pool.query(sql, params);
  if (result.rowCount <= 0) return null;

  const row = result.rows[0] || {};
  const parts = [row.WHSEADDR1, row.WHSEADDR2, row.WHSEADDR3, row.CITY, row.STATE, row.COUNTRY].filter(
    (v) => !isNullLike(v)
  );
  const label = row.WHSENAME || warehouse;
  const answer =
    parts.length > 0
      ? `${label} warehouse is located at ${parts.join(", ")}.`
      : `${label} warehouse location is available in WHSEMST00.`;

  return {
    sql: String(sql).trim(),
    params,
    answer,
    explanation: "Fast warehouse location lookup",
    result: { rowCount: result.rowCount, rows: result.rows }
  };
}

async function deriveStatusThresholdsFromTable(pool, { schema, table, statusColumn }) {
  const tableRef = `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
  const statusRef = quoteIdentifier(statusColumn);
  const sql = `
    SELECT DISTINCT
      NULLIF(regexp_replace(cast(${statusRef} as text), '[^0-9.-]', '', 'g'), '')::numeric AS status_num
    FROM ${tableRef}
    WHERE ${statusRef} IS NOT NULL
    ORDER BY status_num DESC
    LIMIT 2
  `;
  const result = await pool.query(sql);
  const values = result.rows
    .map((row) => toStatusNumber(row?.status_num))
    .filter((value) => value !== null)
    .sort((a, b) => b - a);
  if (values.length === 0) return null;
  return { done: values[0], inProgress: values.length > 1 ? values[1] : null };
}

export async function applyStatusProcessLogic(pool, { sql, rows }) {
  const statusKey = getStatusColumnKey(rows);
  if (!statusKey) return { rows, applied: false };

  let thresholds = null;
  const tableInfo = extractPrimaryTableFromSql(sql);
  if (tableInfo?.table) {
    try {
      const schemaTables = await getHeuristicSchemaTables(pool);
      const tableMeta =
        schemaTables.find(
          (table) =>
            String(table.tableSchema || "").toLowerCase() === String(tableInfo.schema || "public").toLowerCase() &&
            String(table.tableName || "").toLowerCase() === String(tableInfo.table || "").toLowerCase()
        ) || null;
      const statusMeta = tableMeta?.columns?.find((column) => String(column.lowerName || "").toLowerCase() === "status");
      if (statusMeta) {
        thresholds = await deriveStatusThresholdsFromTable(pool, {
          schema: tableMeta.tableSchema,
          table: tableMeta.tableName,
          statusColumn: statusMeta.name
        });
      }
    } catch {
      // fallback below
    }
  }

  if (!thresholds) thresholds = deriveStatusThresholdsFromRows(rows, statusKey);
  if (!thresholds) return { rows, applied: false };
  return { rows: appendProcessStateFromThresholds(rows, statusKey, thresholds), applied: true, thresholds };
}

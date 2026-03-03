import { config } from "./config.js";
import { geminiGenerateJson } from "./geminiClient.js";

function buildFallbackAnswer(rows, rowCount) {
  if (!Array.isArray(rows) || rowCount <= 0) {
    return "No matching records were found.";
  }

  const sample = rows.slice(0, 3).map((r) => JSON.stringify(r)).join("; ");
  if (rowCount <= 3) {
    return `Found ${rowCount} row(s): ${sample}`;
  }
  return `Found ${rowCount} row(s). Top rows: ${sample}`;
}

export async function generateSqlPlan({
  question,
  schemaText,
  schemaRulesText = "",
  ragContext,
  allowedTables,
  previousError = "",
  previousSql = ""
}) {
  const allowlistText = allowedTables.map((table) => `- ${table}`).join("\n");
  const retryHint = previousError
    ? `Previous SQL failed with DB/validator error:\n${previousError}\nFailed SQL:\n${previousSql || "N/A"}\nFix the table/column names and join logic using schema exactly.\n\n`
    : "";
  const prompt =
    "You generate PostgreSQL SQL for analytics questions.\n" +
    "Return strict JSON only: {\"sql\":\"...\",\"params\":[...]}\n" +
    "Rules:\n" +
    "- Read only SQL. SELECT/CTE allowed.\n" +
    "- Never use INSERT/UPDATE/DELETE/DDL.\n" +
    "- Use only allowlisted tables.\n" +
    "- For any dynamic value, use placeholders ($1,$2,...) and put raw values in params.\n" +
    "- Use fully-qualified quoted identifiers from schema.\n" +
    "- Never use unquoted identifiers for table/column names.\n" +
    "- No comments. No markdown.\n" +
    "- For joins, use only columns that exist in both tables and prefer stable business keys (*NUM, *ID, etc).\n" +
    "- Prefer join paths that follow FOREIGN KEY / PRIMARY KEY relationships when provided.\n" +
    "- Do not add unnecessary join predicates that can drop rows unless asked.\n" +
    "- For totals/aggregates use COALESCE(SUM(column), 0) when appropriate.\n" +
    "- If prior attempt had NULL-heavy aggregate output, adjust source table/join key and retry.\n" +
    "- If user says '<name> project', prefer token-level matching using ILIKE (case-insensitive).\n" +
    "- Limit detail rows to 100 unless question requests otherwise.\n\n" +
    retryHint +
    `Allowed tables:\n${allowlistText || "- none"}\n\n` +
    `Schema:\n${schemaText}\n\n` +
    `Relational rules:\n${schemaRulesText || "none"}\n\n` +
    `Context:\n${ragContext}\n\n` +
    `Question:\n${question}\n`;

  const output = await geminiGenerateJson({ model: config.geminiSqlModel, prompt });
  const sql = String(output.json?.sql || "").trim();
  const params = Array.isArray(output.json?.params) ? output.json.params : [];
  return { sql, params, usage: output.usage };
}

export async function generateGroundedAnswer({ question, sql, params, rows, rowCount, ragContext }) {
  const rowsPreview = JSON.stringify(rows.slice(0, 100));
  const prompt =
    "Answer using only SQL_RESULT and CONTEXT.\n" +
    "If SQL_RESULT has no rows, return: {\"answer\":\"No matching records were found.\"}\n" +
    "No markdown. No extra keys.\n\n" +
    `Question: ${question}\n` +
    `SQL: ${sql || "none"}\n` +
    `SQL_PARAMS: ${JSON.stringify(params || [])}\n` +
    `ROW_COUNT: ${rowCount}\n` +
    `SQL_RESULT: ${rowsPreview}\n` +
    `CONTEXT: ${ragContext}\n`;

  const output = await geminiGenerateJson({ model: config.geminiAnswerModel, prompt });
  const answer = String(output.json?.answer || "").trim();
  return {
    answer: answer || buildFallbackAnswer(rows, rowCount),
    usage: output.usage
  };
}

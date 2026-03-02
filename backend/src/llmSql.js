import { GoogleGenerativeAI } from "@google/generative-ai";
 
const configuredModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const client = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
let resolvedModelName = null;
 
function requireClient() {
  if (!client) {
    throw new Error("Missing GEMINI_API_KEY in environment");
  }
}
 
async function discoverModelName() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY in environment");
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  if (!response.ok) {
    throw new Error(`Failed to list Gemini models: ${response.status} ${response.statusText}`);
  }
 
  const data = await response.json();
  const models = Array.isArray(data.models) ? data.models : [];
  const supportsGenerate = models.filter((m) =>
    Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent")
  );
 
  const preferred = supportsGenerate.find((m) => m.name === `models/${configuredModel}`);
  if (preferred) {
    return preferred.name.replace(/^models\//, "");
  }
 
  const flash = supportsGenerate.find((m) => /gemini-.*flash/i.test(m.name));
  if (flash) {
    return flash.name.replace(/^models\//, "");
  }
 
  const gemini = supportsGenerate.find((m) => /gemini/i.test(m.name));
  if (gemini) {
    return gemini.name.replace(/^models\//, "");
  }
 
  throw new Error("No Gemini model with generateContent support found for this API key");
}
 
async function getModel() {
  if (!resolvedModelName) {
    resolvedModelName = await discoverModelName();
  }
  return client.getGenerativeModel({ model: resolvedModelName });
}
 
function sanitizeSql(sql) {
  return String(sql || "").trim().replace(/;+$/, "");
}
 
function isSafeSelect(sql) {
  const cleaned = sanitizeSql(sql);
  if (!/^\s*select\b/i.test(cleaned)) {
    return false;
  }
 
  // Block SQL comments and multi-statement chaining.
  if (/--|\/\*|\*\//.test(cleaned) || /;/.test(cleaned)) {
    return false;
  }
 
  // Allow quoted column names like "COMMENT"; only block dangerous commands.
  const blocked = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|do|execute|merge)\b/i;
  return !blocked.test(cleaned);
}
 
function parseJsonObject(text) {
  const cleaned = String(text || "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM did not return valid JSON");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}
 
function quoteIdentifier(name) {
  return `"${String(name).replace(/"/g, "\"\"")}"`;
}
 
async function getSchemaText(pool) {
  const schemaResult = await pool.query(`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name, ordinal_position
  `);
 
  const tables = new Map();
  for (const row of schemaResult.rows) {
    const tableKey = `${quoteIdentifier(row.table_schema)}.${quoteIdentifier(row.table_name)}`;
    const col = `${quoteIdentifier(row.column_name)} (${row.data_type})`;
    if (!tables.has(tableKey)) {
      tables.set(tableKey, []);
    }
    tables.get(tableKey).push(col);
  }
 
  const lines = [];
  for (const [table, cols] of tables.entries()) {
    lines.push(`${table}: ${cols.join(", ")}`);
  }
 
  return lines.join("\n");
}
 
function buildSqlPrompt({ question, schemaText, previousError }) {
  const retryHint = previousError
    ? `Previous database error to fix:\n${previousError}\n\n`
    : "";
 
  return (
    "You convert user questions to PostgreSQL SQL.\n" +
    "Return JSON only with keys: sql, explanation.\n" +
    "Rules:\n" +
    "- Produce one safe SELECT query only.\n" +
    "- No comments. No markdown.\n" +
    "- Use existing schema only.\n" +
    "- Unless user asks for aggregate only, use LIMIT 100.\n" +
    "- ALWAYS use fully-qualified and double-quoted identifiers exactly as shown in schema.\n" +
    "- If user writes '<name> project', do not match full literal phrase; prefer token match (e.g. TCI) with ILIKE.\n" +
    "- For project filters, prefer case-insensitive partial matching using ILIKE.\n" +
    "- Example format: SELECT ... FROM \"public\".\"TASKLIST00\" ...\n\n" +
    `${retryHint}` +
    `Question:\n${question}\n\n` +
    `Database schema:\n${schemaText}\n\n` +
    "Return JSON only."
  );
}
 
export async function generateSqlFromQuestion({ pool, question, previousError = "" }) {
  requireClient();
  const schemaText = await getSchemaText(pool);
  const model = await getModel();
  const prompt = buildSqlPrompt({ question, schemaText, previousError });
 
  const completion = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json" }
  });
 
  const raw = completion.response.text();
  const parsed = parseJsonObject(raw);
  const sql = sanitizeSql(parsed.sql);
 
  if (!sql) {
    throw new Error("LLM returned empty SQL");
  }
  if (!isSafeSelect(sql)) {
    throw new Error("LLM returned unsafe SQL. Only SELECT is allowed.");
  }
 
  return {
    sql,
    explanation: parsed.explanation || "Generated by LLM"
  };
}
 
export async function generateHumanAnswer({ question, sql, rows, rowCount }) {
  requireClient();
  if (rowCount > 0 && Array.isArray(rows) && rows.length > 0) {
    const firstRow = rows[0];
    const keys = Object.keys(firstRow);
    const taskKey = keys.find((k) => k.toUpperCase() === "TASKNAME");
    if (taskKey) {
      const list = rows
        .map((r) => String(r[taskKey] || "").trim())
        .filter(Boolean)
        .slice(0, 20);
      if (list.length > 0) {
        const numbered = list.map((item, index) => `${index + 1}. ${item}`).join("\n");
        return `Found ${rowCount} task(s).\n${numbered}`;
      }
    }
  }
 
  const model = await getModel();
 
  const preview = JSON.stringify(rows.slice(0, 20));
  const prompt =
    "You are a data assistant. Write a concise human answer from SQL result rows.\n" +
    "If rowCount is 0, clearly say no data found.\n" +
    "When returning lists, use numbered lines with each item on a new line.\n\n" +
    `Question: ${question}\n` +
    `SQL: ${sql}\n` +
    `rowCount: ${rowCount}\n` +
    `rowsPreview: ${preview}\n` +
    "Write a short plain-English answer.";
 
  const completion = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 }
  });
 
  return completion.response.text()?.trim() || "No answer generated.";
}
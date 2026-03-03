import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeQuestion } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DELETE_JS_PATH = path.resolve(__dirname, "delete.js");

let registryReady = false;

function extractTemplateBlocks(source, varName) {
  const blocks = [];
  const pattern = new RegExp(`const\\s+${varName}\\s*=\\s*\\\`([\\s\\S]*?)\\\`;`, "g");
  let match = pattern.exec(source);
  while (match) {
    blocks.push(String(match[1] || "").trim());
    match = pattern.exec(source);
  }
  return blocks;
}

function extractCommentedExamplesBlock(source) {
  const lines = String(source || "").split(/\r?\n/);
  const normalizeLine = (line) => String(line || "").replace(/^\s*\/\/\s?/, "");
  const start = lines.findIndex((line) => /const\s+EXAMPLES\s*=\s*`/i.test(normalizeLine(line)));
  if (start === -1) return "";

  const collected = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const normalized = normalizeLine(lines[i]);
    if (/^\s*`;\s*$/i.test(normalized)) break;
    if (/^\s*\/\/\s*----------\s*4\)/i.test(lines[i])) break;
    if (/^\s*function\s+buildSystemPrompt\b/i.test(normalized)) break;
    if (/^\s*const\s+nlToSqlPrompt\b/i.test(normalized)) break;
    collected.push(normalized);
  }
  return collected.join("\n").trim();
}

function extractSourceTables(sql) {
  const regex = /\b(?:from|join)\s+((?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)/gi;
  const nonTableTokens = new Set(["current_date", "current_time", "current_timestamp", "now"]);
  const tables = new Set();
  let match = regex.exec(sql);
  while (match) {
    const raw = String(match[1] || "").replace(/"/g, "").trim().toLowerCase();
    if (!raw || nonTableTokens.has(raw)) {
      match = regex.exec(sql);
      continue;
    }
    tables.add(raw.includes(".") ? raw : `public.${raw}`);
    match = regex.exec(sql);
  }
  return [...tables];
}

function normalizeExampleSql(questionText, sql) {
  let text = String(sql || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  const q = normalizeQuestion(questionText).trim();

  // Hard-coded repairs for malformed examples present in delete.js.
  if (q === "list users who unloading putaway today") {
    text = `
      select ri.userfname as userfname, sum(ri.activityqty) as unloadingqty
      from public.rpt_ibctusrdetl01 ri
      where ri.trandate = current_date and ri.activity = 'Unloading'
      group by ri.userid, ri.userfname
    `;
  } else if (q === "resource plan for unloading putaway activity today shift") {
    text = `
      select round((p.planvalue / 8.0)::numeric, 2) as unloadingpersonsneeded
      from public.planconf01 p
      where p.planactivity = 'PLANACTIVITYPARCVDQTY' and p.date = current_date
      limit 1
    `;
  } else if (q === "resource plan for picking activity today shift") {
    text = `
      select round((p.planvalue / 8.0)::numeric, 2) as pickingpersonsneeded
      from public.planconf01 p
      where p.planactivity = 'PLANACTIVITYPICKQTY' and p.date = current_date
      limit 1
    `;
  } else if (q === "resource plan for loading activity today shift") {
    text = `
      select round((p.planvalue / 8.0)::numeric, 2) as loadingpersonsneeded
      from public.planconf01 p
      where p.planactivity = 'PLANACTIVITYLOADQTY' and p.date = current_date
      limit 1
    `;
  } else if (q === "resource plan for shipment activity today shift") {
    text = `
      select round((p.planvalue / 8.0)::numeric, 2) as shipmentpersonsneeded
      from public.planconf01 p
      where p.planactivity = 'PLANACTIVITYSHIPQTY' and p.date = current_date
      limit 1
    `;
  } else if (q === "unloading planned vs actual today") {
    text = `
      select planned.planvalue as plannedunloadedqty, actual.totalqty as actualunloadedqty
      from
        (
          select p.planvalue as planvalue
          from public.planconf01 p
          where p.planactivity = 'PLANACTIVITYPARCVDQTY' and p.date = current_date
          limit 1
        ) planned,
        (
          select sum(ri.rcvdqty) as totalqty
          from public.rpt_ibctdetl01 ri
          where ri.trandate = current_date and ri.rcpttype = 'STASNRCPT'
        ) actual
    `;
  } else if (q === "putaway planned vs actual today") {
    text = `
      select planned.planvalue as plannedputawayqty, actual.totalqty as actualputawayqty
      from
        (
          select p.planvalue as planvalue
          from public.planconf01 p
          where p.planactivity = 'PLANACTIVITYPARCVDQTY' and p.date = current_date
          limit 1
        ) planned,
        (
          select sum(ri.rcvdqty) as totalqty
          from public.rpt_ibctdetl01 ri
          where ri.trandate = current_date and ri.rcpttype = 'STASNRCPT'
        ) actual
    `;
  } else if (q === "picking planned vs actual today") {
    text = `
      select planned.planvalue as plannedpickedqty, actual.totalqty as actualpickedqty
      from
        (
          select p.planvalue as planvalue
          from public.planconf01 p
          where p.planactivity = 'PLANACTIVITYPICKQTY' and p.date = current_date
          limit 1
        ) planned,
        (
          select sum(ro.activityqty) as totalqty
          from public.rpt_obctusrdetl01 ro
          where ro.trandate = current_date and ro.activity = 'Picking'
        ) actual
    `;
  } else if (q === "loaded planned vs actual today") {
    text = `
      select planned.planvalue as plannedloadedqty, actual.totalqty as actualloadedqty
      from
        (
          select p.planvalue as planvalue
          from public.planconf01 p
          where p.planactivity = 'PLANACTIVITYLOADQTY' and p.date = current_date
          limit 1
        ) planned,
        (
          select sum(ro.activityqty) as totalqty
          from public.rpt_obctusrdetl01 ro
          where ro.trandate = current_date and ro.activity = 'Loading'
        ) actual
    `;
  } else if (
    q ===
    "how many line items invoiced today activity invoiced picked loaded picklist generated picking progress"
  ) {
    text = `
      select sum(ro.ordlines) as orderlines
      from public.rpt_obctdetl01 ro
      where ro.trandate = current_date
      group by ro.trandate
    `;
  } else if (
    q ===
    "how many qty invoiced today activity invoiced picked loaded picklist generated picking progress"
  ) {
    text = `
      select sum(ro.ordqty) as orderqty
      from public.rpt_obctdetl01 ro
      where ro.trandate = current_date
      group by ro.trandate
    `;
  } else if (q === "list users who picking loading today activity loading picking") {
    text = `
      select ro.userfname as userfname, sum(ro.activityqty) as unloadingqty
      from public.rpt_obctusrdetl01 ro
      where ro.trandate = current_date and ro.activity = 'Loading'
      group by ro.userid, ro.userfname
    `;
  }

  if (!/[;]\s*$/.test(text)) text = `${text};`;

  if (/\btoday\b/.test(q)) {
    text = text.replace(/'2025-06-01'/g, "current_date").replace(/'2025-09-01'/g, "current_date");
  }
  return text;
}

function parseExamplesFromDeleteJs() {
  if (!fs.existsSync(DELETE_JS_PATH)) return [];
  const raw = fs.readFileSync(DELETE_JS_PATH, "utf8");
  const uncommented = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\/\/\s?/, ""))
    .join("\n");
  const exampleBlocks = [
    ...extractTemplateBlocks(raw, "EXAMPLES"),
    ...extractTemplateBlocks(uncommented, "EXAMPLES"),
    extractCommentedExamplesBlock(raw)
  ].filter(Boolean);
  if (exampleBlocks.length === 0) return [];

  const exampleBlock =
    exampleBlocks
      .map((block) => ({
        block,
        score: (String(block || "").match(/--\s*Example\b/gi) || []).length,
        headerScore: (String(block || "").match(/^\s*--\s*Example\b/gim) || []).length
      }))
      .sort((a, b) => b.headerScore - a.headerScore || b.score - a.score)[0]?.block || "";

  const rows = [];
  const lines = String(exampleBlock || "").split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = String(lines[i] || "").trim();
    const header = line.match(/^--\s*Example\s+[A-Z0-9]+:\s*(.+)$/i);
    if (!header) {
      i += 1;
      continue;
    }

    const questionText = String(header[1] || "").trim();
    i += 1;

    while (i < lines.length && !/^\s*(select|with)\b/i.test(String(lines[i] || ""))) {
      if (/^--\s*Example\s+/i.test(String(lines[i] || "").trim())) break;
      i += 1;
    }

    const sqlLines = [];
    while (i < lines.length) {
      const current = String(lines[i] || "");
      if (/^--\s*Example\s+/i.test(current.trim())) break;
      if (/^\s*--/.test(current)) {
        i += 1;
        continue;
      }
      sqlLines.push(current);
      i += 1;
    }

    const sql = normalizeExampleSql(questionText, sqlLines.join("\n"));
    if (!questionText || !sql || !/^\s*(select|with)\b/i.test(sql)) continue;

    rows.push({
      questionText,
      normalizedQuestion: normalizeQuestion(questionText),
      sqlText: sql,
      sourceTables: extractSourceTables(sql)
    });
  }

  const dedup = new Map();
  for (const row of rows) {
    if (!row.normalizedQuestion) continue;
    dedup.set(row.normalizedQuestion, row);
  }
  return [...dedup.values()];
}

export function getDeleteJsRegistryExamplesPreview() {
  return parseExamplesFromDeleteJs();
}

export async function ensureQuestionSqlRegistry(pool) {
  if (registryReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.question_sql_registry (
      id BIGSERIAL PRIMARY KEY,
      source_name TEXT NOT NULL DEFAULT 'delete_js',
      question_text TEXT NOT NULL,
      normalized_question TEXT NOT NULL UNIQUE,
      sql_text TEXT NOT NULL,
      source_tables TEXT[] NOT NULL DEFAULT '{}'::text[],
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      hit_count BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_hit_at TIMESTAMPTZ
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_question_sql_registry_active ON public.question_sql_registry(is_active, normalized_question)`
  );

  const examples = parseExamplesFromDeleteJs();
  await pool.query(`UPDATE public.question_sql_registry SET is_active = FALSE WHERE source_name = 'delete_js'`);
  for (const entry of examples) {
    await pool.query(
      `
      INSERT INTO public.question_sql_registry (
        source_name, question_text, normalized_question, sql_text, source_tables, is_active, updated_at
      )
      VALUES ($1, $2, $3, $4, $5::text[], TRUE, now())
      ON CONFLICT (normalized_question) DO UPDATE
      SET
        source_name = EXCLUDED.source_name,
        question_text = EXCLUDED.question_text,
        sql_text = EXCLUDED.sql_text,
        source_tables = EXCLUDED.source_tables,
        is_active = TRUE,
        updated_at = now()
      `,
      ["delete_js", entry.questionText, entry.normalizedQuestion, entry.sqlText, entry.sourceTables]
    );
  }

  registryReady = true;
}

export async function findQuestionSqlRegistryMatch(pool, normalizedQuestion) {
  const exact = await pool.query(
    `
    SELECT id, source_name, question_text, normalized_question, sql_text, source_tables
    FROM public.question_sql_registry
    WHERE normalized_question = $1
      AND is_active = TRUE
    LIMIT 1
    `,
    [normalizedQuestion]
  );
  if (exact.rows[0]) return exact.rows[0];

  const candidates = await pool.query(
    `
    SELECT id, source_name, question_text, normalized_question, sql_text, source_tables
    FROM public.question_sql_registry
    WHERE is_active = TRUE
    `
  );
  const needle = String(normalizedQuestion || "").trim();
  if (!needle || candidates.rowCount === 0) return null;

  const tokenize = (text) =>
    String(text || "")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

  const needleTokens = tokenize(needle);
  const needleSet = new Set(needleTokens);

  let best = null;
  let bestScore = 0;

  for (const row of candidates.rows) {
    const hay = String(row.normalized_question || "").trim();
    if (!hay) continue;
    if (hay === needle) return row;

    let score = 0;
    if (hay.includes(needle) || needle.includes(hay)) {
      score += 0.95;
    }

    const hayTokens = tokenize(hay);
    const haySet = new Set(hayTokens);
    let intersect = 0;
    for (const token of needleSet) {
      if (haySet.has(token)) intersect += 1;
    }
    const union = new Set([...needleTokens, ...hayTokens]).size || 1;
    const jaccard = intersect / union;
    score = Math.max(score, jaccard);

    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  if (bestScore >= 0.62) return best;
  return null;
}

export async function markQuestionSqlRegistryHit(pool, id) {
  if (!id) return;
  await pool.query(
    `
    UPDATE public.question_sql_registry
    SET hit_count = hit_count + 1, last_hit_at = now()
    WHERE id = $1
    `,
    [id]
  );
}

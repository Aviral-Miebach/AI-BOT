import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRAINING_JSON_PATH = path.resolve(__dirname, "..", "sql", "wms_table_context_for_training.json");
const TRAINING_MD_PATH = path.resolve(__dirname, "..", "sql", "wms_table_context_for_training.md");

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_PROMPT_CHARS = 4500;
const DEFAULT_MAX_TABLES = 6;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "by",
  "for",
  "from",
  "get",
  "give",
  "how",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "show",
  "the",
  "to",
  "what",
  "where",
  "which",
  "with"
]);

let cache = {
  loadedAtMs: 0,
  jsonMtimeMs: 0,
  mdMtimeMs: 0,
  summaryText: "",
  entries: [],
  sectionsByTable: new Map()
};

function normalizeTableName(name) {
  const raw = String(name || "").replace(/"/g, "").trim().toLowerCase();
  if (!raw) return "";
  return raw.includes(".") ? raw : `public.${raw}`;
}

function tokenizeQuestion(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));
}

function hasPhrase(text, phrase) {
  const escaped = String(phrase || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return false;
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function parseMdSections(mdText) {
  const lines = String(mdText || "").replace(/\r\n/g, "\n").split("\n");
  const sections = new Map();
  const summaryLines = [];
  let currentKey = "";
  let currentLines = [];

  for (const line of lines) {
    const heading = line.match(/^##\s+([A-Z0-9_]+)\s*$/);
    if (heading) {
      if (currentKey && currentLines.length > 0) {
        sections.set(currentKey, currentLines.join("\n").trim());
      }
      currentKey = normalizeTableName(heading[1]);
      currentLines = [];
      continue;
    }

    if (!currentKey) {
      if (summaryLines.length < 30) {
        summaryLines.push(line);
      }
      continue;
    }

    currentLines.push(line);
  }

  if (currentKey && currentLines.length > 0) {
    sections.set(currentKey, currentLines.join("\n").trim());
  }

  return {
    sectionsByTable: sections,
    summaryText: summaryLines.join("\n").trim()
  };
}

function buildEntries(jsonData) {
  const items = Array.isArray(jsonData) ? jsonData : [];
  return items
    .map((item) => {
      const tableRaw = String(item?.table || "").trim();
      const table = normalizeTableName(tableRaw);
      if (!table) return null;

      const tableShort = table.split(".").pop() || "";
      const purpose = String(item?.purpose || "").trim();
      const keyColumns = Array.isArray(item?.key_columns)
        ? item.key_columns.map((c) => String(c || "").trim()).filter(Boolean)
        : [];
      const columns = Array.isArray(item?.columns)
        ? item.columns
            .map((col) => String(col?.name || "").trim())
            .filter(Boolean)
        : [];

      const keySet = new Set(keyColumns.map((c) => c.toLowerCase()));
      const columnSet = new Set(columns.map((c) => c.toLowerCase()));
      const searchable = [tableRaw, tableShort, purpose, keyColumns.join(" "), columns.join(" ")].join(" ").toLowerCase();

      return {
        table,
        tableShort,
        purpose,
        keyColumns,
        columns,
        keySet,
        columnSet,
        searchable
      };
    })
    .filter(Boolean);
}

function scoreEntry(entry, normalizedQuestion, questionTokens) {
  let score = 0;
  const tableLower = entry.table.toLowerCase();
  const tableShortLower = entry.tableShort.toLowerCase();

  if (hasPhrase(normalizedQuestion, tableShortLower)) score += 140;
  if (hasPhrase(normalizedQuestion, tableLower)) score += 180;

  for (const token of questionTokens) {
    if (tableShortLower.includes(token)) score += 9;
    if (entry.purpose.toLowerCase().includes(token)) score += 7;
    if (entry.keySet.has(token)) score += 10;
    if (entry.columnSet.has(token)) score += 6;
    if (entry.searchable.includes(token)) score += 2;
  }

  // Some domain synonyms that frequently appear in user questions.
  if (/\b(truck|turnaround|cycle)\b/.test(normalizedQuestion) && tableShortLower.includes("goct")) score += 30;
  if (/\b(receipt|inbound|grn|putaway|unloading|sti|asn)\b/.test(normalizedQuestion) && tableShortLower.includes("ibct")) score += 18;
  if (/\b(order|outbound|picking|loading|invoice|manifest|shipment)\b/.test(normalizedQuestion) && tableShortLower.includes("obct")) score += 18;
  if (/\b(activity|transaction|tasks)\b/.test(normalizedQuestion) && tableShortLower.includes("activity")) score += 16;
  if (/\b(warehouse|location|whse)\b/.test(normalizedQuestion) && tableShortLower.includes("whse")) score += 16;

  return score;
}

function clipText(text, maxChars) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}\n...`;
}

function ensureLoaded() {
  if (!config.wmsTrainingContextEnabled) {
    return {
      summaryText: "",
      entries: [],
      sectionsByTable: new Map()
    };
  }

  try {
    const jsonStat = fs.existsSync(TRAINING_JSON_PATH) ? fs.statSync(TRAINING_JSON_PATH) : null;
    const mdStat = fs.existsSync(TRAINING_MD_PATH) ? fs.statSync(TRAINING_MD_PATH) : null;
    const now = Date.now();
    const ttlMs = Math.max(10_000, Number(config.wmsTrainingContextCacheTtlMs || DEFAULT_CACHE_TTL_MS));
    const cacheValid =
      cache.entries.length > 0 &&
      cache.jsonMtimeMs === Number(jsonStat?.mtimeMs || 0) &&
      cache.mdMtimeMs === Number(mdStat?.mtimeMs || 0) &&
      now - cache.loadedAtMs < ttlMs;

    if (cacheValid) {
      return {
        summaryText: cache.summaryText,
        entries: cache.entries,
        sectionsByTable: cache.sectionsByTable
      };
    }

    const jsonTextRaw = jsonStat ? fs.readFileSync(TRAINING_JSON_PATH, "utf8") : "[]";
    const jsonText = String(jsonTextRaw || "").replace(/^\uFEFF/, "");
    const mdText = mdStat ? fs.readFileSync(TRAINING_MD_PATH, "utf8") : "";
    const jsonData = JSON.parse(jsonText);
    const entries = buildEntries(jsonData);
    const { sectionsByTable, summaryText } = parseMdSections(mdText);

    cache = {
      loadedAtMs: now,
      jsonMtimeMs: Number(jsonStat?.mtimeMs || 0),
      mdMtimeMs: Number(mdStat?.mtimeMs || 0),
      summaryText,
      entries,
      sectionsByTable
    };

    return { summaryText, entries, sectionsByTable };
  } catch {
    return {
      summaryText: "",
      entries: [],
      sectionsByTable: new Map()
    };
  }
}

function getRankedEntries(question, allowedTables = [], maxTables = DEFAULT_MAX_TABLES) {
  const { entries } = ensureLoaded();
  if (entries.length === 0) return [];

  const normalizedQuestion = String(question || "").toLowerCase();
  const tokens = tokenizeQuestion(question);
  const allowedSet =
    Array.isArray(allowedTables) && allowedTables.length > 0
      ? new Set(allowedTables.map((table) => normalizeTableName(table)))
      : null;

  const ranked = entries
    .filter((entry) => !allowedSet || allowedSet.has(entry.table))
    .map((entry) => ({ entry, score: scoreEntry(entry, normalizedQuestion, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Number(maxTables || DEFAULT_MAX_TABLES)));

  return ranked;
}

export function getWmsTrainingSuggestedTables({ question, schemaTables = [], baseAllowedTables = [], maxTables }) {
  if (!config.wmsTrainingContextEnabled) return [];
  const schemaSet = new Set((schemaTables || []).map((table) => normalizeTableName(table)));
  const allowSource = Array.isArray(baseAllowedTables) && baseAllowedTables.length > 0 ? baseAllowedTables : schemaTables;
  const allowSet = [...new Set((allowSource || []).map((table) => normalizeTableName(table)).filter((t) => schemaSet.has(t)))];
  const ranked = getRankedEntries(question, allowSet, maxTables || config.wmsTrainingContextRoutingMaxTables);
  return ranked.map((row) => row.entry.table);
}

export function getWmsTrainingPromptSeed({ question, allowedTables = [], maxTables }) {
  if (!config.wmsTrainingContextEnabled) return "";
  const { summaryText, sectionsByTable } = ensureLoaded();
  const ranked = getRankedEntries(question, allowedTables, maxTables || config.wmsTrainingContextPromptMaxTables);
  if (ranked.length === 0) return "";

  const lines = [];
  lines.push("WMS_TRAINING_TABLE_HINTS:");
  if (summaryText) {
    const compactSummary = summaryText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8)
      .join(" | ");
    if (compactSummary) lines.push(`Summary: ${compactSummary}`);
  }
  lines.push("Use these tables first when they match the question intent.");

  for (const { entry } of ranked) {
    const keyCols = entry.keyColumns.slice(0, 8).join(", ");
    const cols = entry.columns.slice(0, 16).join(", ");
    lines.push(`- ${entry.table}: ${entry.purpose || "No purpose provided."}`);
    if (keyCols) lines.push(`  Key columns: ${keyCols}`);
    if (cols) lines.push(`  Important columns: ${cols}`);

    const mdSection = String(sectionsByTable.get(entry.table) || "").trim();
    if (mdSection) {
      const excerpt = mdSection
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join(" | ");
      if (excerpt) lines.push(`  MD context: ${excerpt}`);
    }
  }

  return clipText(lines.join("\n"), Math.max(800, Number(config.wmsTrainingContextMaxPromptChars || DEFAULT_MAX_PROMPT_CHARS)));
}

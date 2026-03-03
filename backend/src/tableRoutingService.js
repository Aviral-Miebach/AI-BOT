import { config } from "./config.js";

const QUESTION_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "by",
  "for",
  "from",
  "give",
  "hai",
  "how",
  "in",
  "is",
  "ka",
  "ke",
  "ki",
  "kitna",
  "kitne",
  "kya",
  "list",
  "me",
  "mein",
  "of",
  "on",
  "show",
  "table",
  "tables",
  "the",
  "to",
  "what",
  "which"
]);

const KEYWORD_TABLE_HINTS = [
  {
    keywords: ["transaction", "transactions", "activity", "completed"],
    tables: ["public.rpt_activity01", "public.rpt_activity01_20250403"]
  },
  {
    keywords: ["receipt", "receipts", "inbound", "grn", "unloading", "putaway", "sti", "asn"],
    tables: ["public.rpt_ibctdetl01", "public.rpt_ibctstatus01", "public.rpt_ibctusrdetl01", "public.planconf01"]
  },
  {
    keywords: ["order", "orders", "outbound", "picking", "loading", "invoice", "manifest", "shipment"],
    tables: ["public.rpt_obctdetl01", "public.rpt_obctstatus01", "public.rpt_obctusrdetl01", "public.planconf01"]
  },
  {
    keywords: ["stock", "inventory", "sku", "trend"],
    tables: ["public.rpt_stkctdetl01", "public.rpt_stktrandetl01", "public.skumst00"]
  },
  {
    keywords: ["warehouse", "whse", "location"],
    tables: [
      "public.whsemst00",
      "public.rpt_whsectdetl01",
      "public.rpt_mntrhistwhse01",
      "public.rpt_trhistwhse01",
      "public.rpt_wktrhistwhse01"
    ]
  },
  {
    keywords: ["user", "operator", "employee", "resource"],
    tables: [
      "public.usrmst00",
      "public.rpt_ibctusrdetl01",
      "public.rpt_obctusrdetl01",
      "public.rpt_mntrhistuser01",
      "public.rpt_trhistuser01",
      "public.rpt_wktrhistuser01"
    ]
  },
  {
    keywords: ["vendor", "supplier"],
    tables: ["public.vndmst00", "public.rpt_ibctdetl01"]
  },
  {
    keywords: ["customer", "client"],
    tables: ["public.cusmst00", "public.rpt_obctdetl01"]
  },
  {
    keywords: ["company", "owner"],
    tables: ["public.compmst00", "public.ctlbrd01", "public.planconf01"]
  },
  {
    keywords: ["shift"],
    tables: ["public.shiftdetl01", "public.rpt_goctdetl01", "public.rpt_ibctdetl01", "public.rpt_obctdetl01"]
  }
];

const TABLE_CONNECTIONS = [
  ["public.compmst00", "public.ctlbrd01"],
  ["public.compmst00", "public.cusmst00"],
  ["public.compmst00", "public.planconf01"],
  ["public.compmst00", "public.rpt_activity01"],
  ["public.compmst00", "public.rpt_activity01_20250403"],
  ["public.compmst00", "public.rpt_goctdetl01"],
  ["public.compmst00", "public.rpt_ibctdetl01"],
  ["public.compmst00", "public.rpt_ibctstatus01"],
  ["public.compmst00", "public.rpt_ibctusrdetl01"],
  ["public.compmst00", "public.rpt_locutlog01"],
  ["public.compmst00", "public.rpt_mntrhistuser01"],
  ["public.compmst00", "public.rpt_mntrhistwhse01"],
  ["public.compmst00", "public.rpt_obctdetl01"],
  ["public.compmst00", "public.rpt_obctstatus01"],
  ["public.compmst00", "public.rpt_obctusrdetl01"],
  ["public.compmst00", "public.rpt_stkctdetl01"],
  ["public.compmst00", "public.rpt_stktrandetl01"],
  ["public.compmst00", "public.rpt_trhistuser01"],
  ["public.compmst00", "public.rpt_trhistwhse01"],
  ["public.compmst00", "public.rpt_whsectdetl01"],
  ["public.compmst00", "public.rpt_wktrhistuser01"],
  ["public.compmst00", "public.rpt_wktrhistwhse01"],
  ["public.compmst00", "public.shiftdetl01"],
  ["public.compmst00", "public.skumst00"],
  ["public.compmst00", "public.usrmst00"],
  ["public.compmst00", "public.vndmst00"],
  ["public.compmst00", "public.whsemst00"],
  ["public.rpt_ibctdetl01", "public.rpt_ibctstatus01"],
  ["public.rpt_ibctdetl01", "public.rpt_ibctusrdetl01"],
  ["public.rpt_obctdetl01", "public.rpt_obctstatus01"],
  ["public.rpt_obctdetl01", "public.rpt_obctusrdetl01"],
  ["public.rpt_stkctdetl01", "public.rpt_stktrandetl01"],
  ["public.rpt_activity01", "public.rpt_activity01_20250403"],
  ["public.rpt_stktrandetl01", "public.skumst00"],
  ["public.rpt_ibctdetl01", "public.vndmst00"],
  ["public.rpt_obctdetl01", "public.cusmst00"],
  ["public.rpt_whsectdetl01", "public.whsemst00"],
  ["public.rpt_mntrhistwhse01", "public.whsemst00"],
  ["public.rpt_trhistwhse01", "public.whsemst00"],
  ["public.rpt_wktrhistwhse01", "public.whsemst00"],
  ["public.rpt_mntrhistuser01", "public.usrmst00"],
  ["public.rpt_trhistuser01", "public.usrmst00"],
  ["public.rpt_wktrhistuser01", "public.usrmst00"]
];

function normalizeTableName(name) {
  return String(name || "").replace(/"/g, "").toLowerCase();
}

function tokenizeQuestion(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !QUESTION_STOP_WORDS.has(token));
}

function toAliases(fqtn) {
  const normalized = normalizeTableName(fqtn);
  const parts = normalized.split(".");
  if (parts.length === 2) return [normalized, parts[1]];
  return [normalized];
}

function hasPhrase(text, phrase) {
  return new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

function buildAdjacency(tables) {
  const tableSet = new Set((tables || []).map((name) => normalizeTableName(name)));
  const adjacency = new Map();
  for (const table of tableSet) {
    adjacency.set(table, new Set());
  }
  for (const [aRaw, bRaw] of TABLE_CONNECTIONS) {
    const a = normalizeTableName(aRaw);
    const b = normalizeTableName(bRaw);
    if (!tableSet.has(a) || !tableSet.has(b)) continue;
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  }
  return adjacency;
}

export function computeScopedAllowlist({ question, schemaTables = [], baseAllowedTables = [], preferredTables = [] }) {
  const normalizedQuestion = String(question || "").toLowerCase();
  const allTables = (baseAllowedTables || []).map((table) => normalizeTableName(table));
  const schemaSet = new Set((schemaTables || []).map((table) => normalizeTableName(table)));
  const candidateTables = [...new Set(allTables.filter((table) => schemaSet.has(table)))];

  if (!config.scopedAllowlistEnabled) return candidateTables;
  if (candidateTables.length <= config.scopedAllowlistMaxTables) return candidateTables;
  if (/\b(all tables|all data|sab table|complete data|entire database)\b/i.test(normalizedQuestion)) {
    return candidateTables;
  }

  const tokens = tokenizeQuestion(question);
  const scoreByTable = new Map(candidateTables.map((table) => [table, 0]));
  const preferredSet = new Set(
    (preferredTables || [])
      .map((table) => normalizeTableName(table))
      .filter((table) => scoreByTable.has(table))
  );

  for (const table of candidateTables) {
    const aliases = toAliases(table);
    for (const alias of aliases) {
      if (hasPhrase(normalizedQuestion, alias)) {
        scoreByTable.set(table, (scoreByTable.get(table) || 0) + 100);
      }
    }
    for (const token of tokens) {
      if (aliases.some((alias) => alias.includes(token))) {
        scoreByTable.set(table, (scoreByTable.get(table) || 0) + 2);
      }
    }
  }

  for (const hint of KEYWORD_TABLE_HINTS) {
    const matched = hint.keywords.some((keyword) => hasPhrase(normalizedQuestion, keyword));
    if (!matched) continue;
    for (const table of hint.tables) {
      const normalized = normalizeTableName(table);
      if (!scoreByTable.has(normalized)) continue;
      scoreByTable.set(normalized, (scoreByTable.get(normalized) || 0) + 18);
    }
  }

  for (const preferredTable of preferredSet) {
    scoreByTable.set(preferredTable, (scoreByTable.get(preferredTable) || 0) + 80);
  }

  const scored = [...scoreByTable.entries()].sort((a, b) => b[1] - a[1]);
  const seeds = scored.filter(([, score]) => score > 0).slice(0, 5).map(([table]) => table);
  if (seeds.length === 0) {
    return candidateTables;
  }

  const adjacency = buildAdjacency(candidateTables);
  const selected = new Set(seeds);
  const queue = [...seeds];
  const maxTables = Math.min(config.scopedAllowlistMaxTables, candidateTables.length);

  while (queue.length > 0 && selected.size < maxTables) {
    const current = queue.shift();
    const neighbors = [...(adjacency.get(current) || [])].sort(
      (a, b) => (scoreByTable.get(b) || 0) - (scoreByTable.get(a) || 0)
    );
    for (const neighbor of neighbors) {
      if (selected.has(neighbor)) continue;
      selected.add(neighbor);
      queue.push(neighbor);
      if (selected.size >= maxTables) break;
    }
  }

  return [...selected];
}

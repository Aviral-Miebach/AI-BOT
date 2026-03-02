const STRUCTURED_KEYWORDS = [
  "count",
  "how many",
  "list",
  "show",
  "what is",
  "which",
  "where",
  "desc",
  "description",
  "table",
  "column",
  "find",
  "total",
  "tasks",
  "project",
  "records",
  "rows"
];

const NON_STRUCTURED_KEYWORDS = ["hello", "hi", "hey", "thanks", "thank you", "who are you", "help"];

const PROJECT_CODE = /\b(?:[a-z]{2,10}-\d{1,6}|[a-z]{2,4}\d{2,6})\b/gi;
const DATE_HINTS = /\b(today|yesterday|tomorrow|week|month|year|q[1-4]|last|next|current)\b/gi;
const TABLE_LIKE_TOKEN = /\b[A-Z_]{3,}\d{0,2}\b/;

function hasPhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

export function looksLikeStructuredQuestion(question) {
  const raw = String(question || "").trim();
  const q = raw.toLowerCase();
  if (!raw) return false;
  if (TABLE_LIKE_TOKEN.test(raw)) return true;
  if (/\b(join|group by|order by|sum|avg|min|max|count|distinct|status|where|in)\b/i.test(raw)) return true;
  if (STRUCTURED_KEYWORDS.some((k) => hasPhrase(q, k))) return true;
  return false;
}

export function detectIntentAndEntities(question) {
  const raw = String(question || "").trim();
  const q = raw.toLowerCase();
  const isSmallTalk = NON_STRUCTURED_KEYWORDS.some((k) => hasPhrase(q, k));
  const hasStructuredSignal = looksLikeStructuredQuestion(raw);
  // Default to SQL path for user questions unless clearly small-talk.
  const intent = !isSmallTalk && (hasStructuredSignal || q.includes("?") || q.split(/\s+/).length >= 3)
    ? "structured_query"
    : "knowledge_lookup";

  const projects = [...new Set((q.match(PROJECT_CODE) || []).map((s) => s.toUpperCase()))];
  const dateHints = [...new Set((q.match(DATE_HINTS) || []).map((s) => s.toLowerCase()))];

  return {
    intent,
    entities: {
      projects,
      dateHints
    }
  };
}

function sameStringArray(a, b) {
  const left = Array.isArray(a) ? [...a].sort() : [];
  const right = Array.isArray(b) ? [...b].sort() : [];
  return left.length === right.length && left.every((item, i) => item === right[i]);
}

export function isEntityCompatible(currentEntities, cachedEntities) {
  if (!cachedEntities || typeof cachedEntities !== "object") return false;
  const current = currentEntities || {};
  const cached = cachedEntities || {};

  if (!sameStringArray(current.projects, cached.projects)) return false;
  if (!sameStringArray(current.dateHints, cached.dateHints)) return false;
  return true;
}

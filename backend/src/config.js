const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toBool = (value, fallback = false) => {
  if (value == null) return fallback;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return fallback;
};

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  port: toNumber(process.env.PORT, 4000),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiSqlModel: process.env.GEMINI_SQL_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash",
  geminiAnswerModel: process.env.GEMINI_ANSWER_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash",
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  embeddingDimensions: toNumber(process.env.EMBEDDING_DIMENSIONS, 768),
  redisUrl: process.env.REDIS_URL || "",
  redisExactTtlSec: toNumber(process.env.REDIS_EXACT_TTL_SEC, 1800),
  semanticThreshold: toNumber(process.env.SEMANTIC_THRESHOLD, 0.9),
  semanticTtlHours: toNumber(process.env.SEMANTIC_TTL_HOURS, 24),
  ragTopK: toNumber(process.env.RAG_TOP_K, 8),
  ragMinScore: toNumber(process.env.RAG_MIN_SCORE, 0.75),
  sqlTimeoutMs: toNumber(process.env.SQL_TIMEOUT_MS, 3000),
  sourceFingerprint: process.env.SOURCE_FINGERPRINT || "default",
  enforceAllowlist: toBool(process.env.ENFORCE_TABLE_ALLOWLIST, true),
  allowedTables: parseCsv(process.env.ALLOWED_TABLES).map((name) => name.toLowerCase())
};

export function assertCoreConfig() {
  if (!config.geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
}

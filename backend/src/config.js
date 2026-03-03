import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env early so config values are always available regardless of import order.
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

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

const parseSchemaName = (value, fallback) => {
  const normalized = String(value || fallback || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (!normalized) return fallback;
  return normalized;
};

function inferDbNameFromUrl() {
  const raw = String(process.env.DATABASE_URL || process.env.PGDB_URI || "").trim();
  if (!raw) return "";
  const withoutParams = raw.split("?")[0];
  const lastSlash = withoutParams.lastIndexOf("/");
  if (lastSlash === -1) return "";
  return String(withoutParams.slice(lastSlash + 1) || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function inferSourceFingerprint() {
  const explicit = String(process.env.SOURCE_FINGERPRINT || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (explicit) return explicit;

  const dbName =
    String(process.env.DB_NAME || "").trim() ||
    inferDbNameFromUrl();
  return dbName ? `db:${dbName.toLowerCase()}` : "db:default";
}

export const config = {
  port: toNumber(process.env.PORT, 4000),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiSqlModel: process.env.GEMINI_SQL_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash",
  geminiAnswerModel: process.env.GEMINI_ANSWER_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash",
  geminiFallbackModels: parseCsv(process.env.GEMINI_FALLBACK_MODELS).map((name) =>
    String(name || "").trim().replace(/^models\//i, "")
  ),
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  embeddingDimensions: toNumber(process.env.EMBEDDING_DIMENSIONS, 768),
  redisUrl: process.env.REDIS_URL || "",
  redisExactTtlSec: toNumber(process.env.REDIS_EXACT_TTL_SEC, 1800),
  semanticThreshold: toNumber(process.env.SEMANTIC_THRESHOLD, 0.9),
  ragTopK: toNumber(process.env.RAG_TOP_K, 8),
  ragMinScore: toNumber(process.env.RAG_MIN_SCORE, 0.75),
  sqlTimeoutMs: toNumber(process.env.SQL_TIMEOUT_MS, 3000),
  maxSqlAttempts: Math.max(1, toNumber(process.env.MAX_SQL_ATTEMPTS, 3)),
  heuristicSchemaCacheTtlMs: toNumber(process.env.HEURISTIC_SCHEMA_CACHE_TTL_MS, 5 * 60 * 1000),
  schemaRulesMaxLines: Math.max(50, toNumber(process.env.SCHEMA_RULES_MAX_LINES, 400)),
  maxMultiTableLookupTables: Math.max(2, toNumber(process.env.MAX_MULTI_TABLE_LOOKUP_TABLES, 20)),
  maxRowsPerTableLookup: Math.max(1, toNumber(process.env.MAX_ROWS_PER_TABLE_LOOKUP, 3)),
  sourceFingerprint: inferSourceFingerprint(),
  appSchema: parseSchemaName(process.env.APP_SCHEMA, "public"),
  vectorSchema: parseSchemaName(process.env.VECTOR_SCHEMA, "public"),
  enforceAllowlist: toBool(process.env.ENFORCE_TABLE_ALLOWLIST, true),
  allowedTables: parseCsv(process.env.ALLOWED_TABLES).map((name) => name.toLowerCase())
};

export function assertCoreConfig() {
  if (!config.geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
}

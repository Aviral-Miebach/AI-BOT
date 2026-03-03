import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Pool } from "pg";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer backend/.env; fallback to backend/src/.env if user created it there.
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

function buildConnectionStringFromParts() {
  const { DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME } = process.env;
  if (!DB_USER || !DB_HOST || !DB_PORT || !DB_NAME) {
    return null;
  }

  const user = encodeURIComponent(DB_USER);
  const pass = encodeURIComponent(DB_PASS || "");
  const auth = pass ? `${user}:${pass}` : user;
  return `postgresql://${auth}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.PGDB_URI ||
  buildConnectionStringFromParts();

if (!connectionString) {
  throw new Error("Missing DB connection: set DATABASE_URL, PGDB_URI, or DB_* vars");
}

function normalizeSchemaToken(name) {
  const value = String(name || "").trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) ? value : "public";
}

const appSchema = normalizeSchemaToken(config.appSchema || "public");
const vectorSchema = normalizeSchemaToken(config.vectorSchema || "public");
const searchPath = Array.from(new Set([appSchema, vectorSchema, "public"])).join(",");

export const pool = new Pool({
  connectionString,
  options: `-c search_path=${searchPath}`
});

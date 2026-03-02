import { parse } from "pgsql-ast-parser";
import { config } from "./config.js";

const FORBIDDEN_PATTERN = /\b(drop|delete|update|insert|alter|truncate|create|grant|revoke)\b/i;
const COMMENT_PATTERN = /(--|\/\*)/;

function sanitizeSql(sql) {
  return String(sql || "").trim().replace(/;+$/, "");
}

function normalizeTableName(raw) {
  return String(raw || "")
    .replace(/"/g, "")
    .trim()
    .toLowerCase();
}

function extractTableNames(sql) {
  const matches = [];
  const regex = /\b(?:from|join)\s+((?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)/gi;
  let m;
  while ((m = regex.exec(sql))) {
    matches.push(normalizeTableName(m[1]));
  }
  return [...new Set(matches)];
}

function checkStatementTypes(ast) {
  for (const stmt of ast) {
    const type = String(stmt?.type || "").toLowerCase();
    if (type && type !== "select") {
      return false;
    }
  }
  return true;
}

function validatePlaceholders(sql, params) {
  const all = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  if (all.length === 0 && /'[^']*'/.test(sql)) {
    return { ok: false, reason: "string_literals_not_allowed_use_placeholders" };
  }
  if (all.length === 0) return { ok: true };

  const max = Math.max(...all);
  const paramCount = Array.isArray(params) ? params.length : 0;
  if (max > paramCount) {
    return { ok: false, reason: "placeholder_out_of_range" };
  }
  return { ok: true };
}

function fallbackSelectShapeCheck(sql) {
  const compact = String(sql || "").trim();
  if (!compact) return { ok: false, reason: "empty_sql" };
  if (compact.includes(";")) return { ok: false, reason: "multiple_statements_not_allowed" };
  if (!/^(select|with)\b/i.test(compact)) {
    return { ok: false, reason: "only_readonly_select_allowed" };
  }
  return { ok: true };
}

export function validateReadOnlySql(sql, params, allowedTables) {
  const cleaned = sanitizeSql(sql);
  if (!cleaned) return { ok: false, reason: "empty_sql" };
  if (COMMENT_PATTERN.test(cleaned)) return { ok: false, reason: "comments_not_allowed" };
  if (FORBIDDEN_PATTERN.test(cleaned)) return { ok: false, reason: "forbidden_keyword" };

  const placeholderCheck = validatePlaceholders(cleaned, params);
  if (!placeholderCheck.ok) return placeholderCheck;

  const allowlist = new Set((allowedTables || []).map((t) => String(t).toLowerCase()));
  const validateAllowlist = () => {
    if (!config.enforceAllowlist) return { ok: true };
    if (allowlist.size === 0) {
      return { ok: false, reason: "allowlist_not_configured" };
    }

    const tables = extractTableNames(cleaned);
    for (const table of tables) {
      if (!allowlist.has(table)) {
        return { ok: false, reason: `table_not_allowed:${table}` };
      }
    }
    return { ok: true };
  };

  let ast;
  try {
    ast = parse(cleaned);
  } catch {
    const shape = fallbackSelectShapeCheck(cleaned);
    if (!shape.ok) return shape;
    const allowlistCheck = validateAllowlist();
    if (!allowlistCheck.ok) return allowlistCheck;
    return { ok: true, sql: cleaned };
  }

  if (!checkStatementTypes(ast)) {
    return { ok: false, reason: "only_readonly_select_allowed" };
  }

  const allowlistCheck = validateAllowlist();
  if (!allowlistCheck.ok) return allowlistCheck;

  return { ok: true, sql: cleaned };
}

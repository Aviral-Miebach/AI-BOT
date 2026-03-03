function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unwrapIdent(token) {
  const t = String(token || "").trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/""/g, '"');
  }
  return t;
}

function normalizeQualifiedTableRefs(sql, tableMap) {
  let out = String(sql || "");
  if (!out) return out;

  // Handle dotted single token first: "schema.table"
  // This prevents split-token pass from matching inside quoted dotted text.
  const dottedQuotedPattern = /"([^"]+)\.([^"]+)"/g;
  out = out.replace(dottedQuotedPattern, (full, schema, table) => {
    const key = `${String(schema).toLowerCase()}.${String(table).toLowerCase()}`;
    return tableMap.get(key) || full;
  });

  // Handle: schema.table, "schema".table, schema."table", "schema"."table" (with optional spaces around dot)
  const splitRefPattern = /("(?:""|[^"])+"|[A-Za-z_][A-Za-z0-9_$]*)\s*\.\s*("(?:""|[^"])+"|[A-Za-z_][A-Za-z0-9_$]*)/g;
  out = out.replace(splitRefPattern, (full, left, right) => {
    const schema = unwrapIdent(left);
    const table = unwrapIdent(right);
    const key = `${schema.toLowerCase()}.${table.toLowerCase()}`;
    return tableMap.get(key) || full;
  });

  return out;
}

function buildUnqualifiedTableMap(tableMap) {
  const byShortName = new Map();
  for (const [lowerFqtn, quotedFqtn] of tableMap.entries()) {
    const parts = String(lowerFqtn || "").split(".");
    const shortName = parts.length === 2 ? parts[1] : "";
    if (!shortName) continue;
    if (!byShortName.has(shortName)) {
      byShortName.set(shortName, quotedFqtn);
      continue;
    }
    if (byShortName.get(shortName) !== quotedFqtn) {
      byShortName.set(shortName, null);
    }
  }
  for (const [shortName, quotedFqtn] of byShortName.entries()) {
    if (!quotedFqtn) byShortName.delete(shortName);
  }
  return byShortName;
}

function normalizeUnqualifiedTableRefs(sql, tableMap) {
  let out = String(sql || "");
  if (!out) return out;
  const unqualifiedMap = buildUnqualifiedTableMap(tableMap);
  if (unqualifiedMap.size === 0) return out;

  // Normalize unqualified table refs only in FROM/JOIN clauses.
  const tableRefPattern = /\b(from|join)\b(\s+)("(?:""|[^"])+"|[A-Za-z_][A-Za-z0-9_$]*)/gi;
  out = out.replace(tableRefPattern, (full, keyword, ws, tableToken) => {
    const unwrapped = unwrapIdent(tableToken);
    if (!unwrapped || unwrapped.includes(".")) return full;
    const canonical = unqualifiedMap.get(unwrapped.toLowerCase());
    if (!canonical) return full;
    return `${keyword}${ws}${canonical}`;
  });

  return out;
}

function normalizeRefToFqtn(ref) {
  const cleaned = String(ref || "").replace(/"/g, "").trim().toLowerCase();
  if (!cleaned) return "";
  if (cleaned.includes(".")) return cleaned;
  return `public.${cleaned}`;
}

function buildAliasMap(sql) {
  const aliasMap = new Map();
  const keywordSet = new Set([
    "on",
    "where",
    "group",
    "order",
    "limit",
    "offset",
    "having",
    "inner",
    "left",
    "right",
    "full",
    "cross",
    "join"
  ]);
  const refPattern =
    /\b(?:from|join)\b\s+((?:"(?:""|[^"])+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\s*\.\s*(?:"(?:""|[^"])+"|[A-Za-z_][A-Za-z0-9_$]*))?)(?:\s+(?:as\s+)?("(?:""|[^"])+"|[A-Za-z_][A-Za-z0-9_$]*))?/gi;

  let match = refPattern.exec(sql);
  while (match) {
    const tableRef = String(match[1] || "").trim();
    const aliasToken = String(match[2] || "").trim();
    const tableFqtn = normalizeRefToFqtn(tableRef);
    if (tableFqtn) {
      aliasMap.set(tableFqtn, tableFqtn);
      const shortName = tableFqtn.split(".").pop();
      if (shortName) aliasMap.set(shortName, tableFqtn);
      if (aliasToken) {
        const alias = unwrapIdent(aliasToken).toLowerCase();
        if (alias && !keywordSet.has(alias)) {
          aliasMap.set(alias, tableFqtn);
        }
      }
    }
    match = refPattern.exec(sql);
  }
  return aliasMap;
}

function normalizeAliasedColumnRefs(sql, columnMap) {
  let out = String(sql || "");
  if (!out || !columnMap || columnMap.size === 0) return out;
  const aliasMap = buildAliasMap(out);
  if (aliasMap.size === 0) return out;

  const aliasColPattern = /("(?:""|[^"])+"|[A-Za-z_][A-Za-z0-9_$]*)\.("(?:""|[^"])+"|[A-Za-z_][A-Za-z0-9_$]*)/g;
  out = out.replace(aliasColPattern, (full, aliasToken, colToken) => {
    const alias = unwrapIdent(aliasToken).toLowerCase();
    const tableFqtn = aliasMap.get(alias);
    if (!tableFqtn) return full;
    const cols = columnMap.get(tableFqtn);
    if (!cols || cols.size === 0) return full;
    const rawCol = unwrapIdent(colToken).toLowerCase();
    const canonical = cols.get(rawCol);
    if (!canonical) return full;
    return `${aliasToken}.${canonical}`;
  });

  return out;
}

export function normalizeSqlTableRefs(sql, tableMap, columnMap = new Map()) {
  let normalized = String(sql || "");
  if (!normalized || !tableMap || tableMap.size === 0) return normalized;

  normalized = normalizeQualifiedTableRefs(normalized, tableMap);
  normalized = normalizeUnqualifiedTableRefs(normalized, tableMap);
  normalized = normalizeAliasedColumnRefs(normalized, columnMap);

  for (const [lowerFqtn, quotedFqtn] of tableMap.entries()) {
    // Normalize full-qualified column references:
    // "public"."TABLE".status  -> "public"."TABLE"."STATUS"
    const cols = columnMap.get(lowerFqtn);
    if (cols && cols.size > 0) {
      const colRefPattern = new RegExp(
        `${escapeRegExp(quotedFqtn)}\\.(\"[^\"]+\"|[A-Za-z_][A-Za-z0-9_]*)`,
        "g"
      );
      normalized = normalized.replace(colRefPattern, (match, colToken) => {
        const raw = String(colToken || "").replace(/"/g, "");
        const canonical = cols.get(raw.toLowerCase());
        if (!canonical) return match;
        return `${quotedFqtn}.${canonical}`;
      });
    }
  }

  // Fix invalid Postgres placeholder form: INTERVAL $1 => ($1)::interval
  normalized = normalized.replace(/\bINTERVAL\s+\$(\d+)\b/gi, "($$$1)::interval");

  return normalized;
}

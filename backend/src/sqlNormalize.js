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

export function normalizeSqlTableRefs(sql, tableMap, columnMap = new Map()) {
  let normalized = String(sql || "");
  if (!normalized || !tableMap || tableMap.size === 0) return normalized;

  normalized = normalizeQualifiedTableRefs(normalized, tableMap);

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

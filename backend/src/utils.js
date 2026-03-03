import crypto from "node:crypto";

export function normalizeQuestion(question) {
  return String(question || "")
    .trim()
    .toLowerCase()
    .replace(/\bhowmany\b/g, "how many")
    .replace(/\bhowmuch\b/g, "how much")
    .replace(/\btodays\b/g, "today")
    .replace(/\bcurrent\s+day\b/g, "today")
    .replace(/\bunloading\/putaway\b/g, "unloading putaway")
    .replace(/\bpicking\/loading\b/g, "picking loading")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ");
}

export function sha256(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

export function toVectorLiteral(vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Invalid embedding vector");
  }
  return `[${vector.join(",")}]`;
}

export function parseJsonObject(text) {
  const raw = String(text || "").trim();
  const normalized = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  const tryParseBalanced = (body) => {
    const firstObject = body.indexOf("{");
    const firstArray = body.indexOf("[");

    let start = -1;
    if (firstObject === -1 && firstArray === -1) start = -1;
    else if (firstObject === -1) start = firstArray;
    else if (firstArray === -1) start = firstObject;
    else start = Math.min(firstObject, firstArray);

    if (start === -1) return null;

    const stack = [];
    let inString = false;
    let escaped = false;

    for (let i = start; i < body.length; i += 1) {
      const ch = body[i];

      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === "{" || ch === "[") {
        stack.push(ch);
        continue;
      }

      if (ch === "}" || ch === "]") {
        const last = stack[stack.length - 1];
        const matched = (last === "{" && ch === "}") || (last === "[" && ch === "]");
        if (!matched) continue;
        stack.pop();
        if (stack.length === 0) {
          try {
            return JSON.parse(body.slice(start, i + 1));
          } catch {
            return null;
          }
        }
      }
    }

    return null;
  };

  const parsed = tryParseBalanced(normalized);
  if (parsed !== null) return parsed;

  // Common model JSON issue: trailing commas.
  const repaired = normalized.replace(/,\s*([}\]])/g, "$1");
  const repairedParsed = tryParseBalanced(repaired);
  if (repairedParsed !== null) return repairedParsed;

  throw new Error("Model output is not valid JSON");
}

export function parseGeminiUsage(response) {
  const usage = response?.response?.usageMetadata || response?.usageMetadata || {};
  return {
    inputTokens: Number(usage.promptTokenCount || 0),
    outputTokens: Number(usage.candidatesTokenCount || 0)
  };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function shiftDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function shiftMonths(date, months) {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`;
}

export function getCacheScopeForQuestion(question, now = new Date()) {
  const q = String(question || "").toLowerCase();
  const monthLookup = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12
  };
  const explicitYearMatch = q.match(/\b(20\d{2})\b/);
  const explicitYear = explicitYearMatch ? Number(explicitYearMatch[1]) : null;
  const monthMatch = q.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/
  );
  const monthNumber = monthMatch ? monthLookup[monthMatch[1]] : null;

  if (/\b(yesterday)\b/.test(q)) {
    return { isTemporal: true, scopeKey: `day:${formatDateKey(shiftDays(now, -1))}` };
  }
  if (/\b(today|current day|todays)\b/.test(q)) {
    return { isTemporal: true, scopeKey: `day:${formatDateKey(now)}` };
  }
  if (/\b(last month|previous month)\b/.test(q)) {
    return { isTemporal: true, scopeKey: `month:${formatMonthKey(shiftMonths(now, -1))}` };
  }
  if (/\b(this month|current month)\b/.test(q)) {
    return { isTemporal: true, scopeKey: `month:${formatMonthKey(now)}` };
  }
  if (/\b(last week|previous week)\b/.test(q)) {
    return { isTemporal: true, scopeKey: `week:${isoWeekKey(shiftDays(now, -7))}` };
  }
  if (/\b(this week|current week)\b/.test(q)) {
    return { isTemporal: true, scopeKey: `week:${isoWeekKey(now)}` };
  }
  if (/\b(last year|previous year)\b/.test(q)) {
    return { isTemporal: true, scopeKey: `year:${now.getFullYear() - 1}` };
  }
  if (/\b(this year|current year)\b/.test(q)) {
    return { isTemporal: true, scopeKey: `year:${now.getFullYear()}` };
  }
  if (monthNumber) {
    const year = explicitYear || now.getFullYear();
    return { isTemporal: true, scopeKey: `month:${year}-${pad2(monthNumber)}` };
  }
  if (explicitYear && /\b(year|fy|financial year)\b/.test(q)) {
    return { isTemporal: true, scopeKey: `year:${explicitYear}` };
  }

  return { isTemporal: false, scopeKey: "static" };
}

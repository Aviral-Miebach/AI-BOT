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
    .replace(/\s+/g, " ")
    .trim();
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

const MONTH_LOOKUP = {
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

function toUtcDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) return null;
  return dt;
}

function addUtcDays(date, days) {
  const out = new Date(date.getTime());
  out.setUTCDate(out.getUTCDate() + Number(days || 0));
  return out;
}

function compareUtcDateOnly(a, b) {
  const ay = a.getUTCFullYear();
  const by = b.getUTCFullYear();
  if (ay !== by) return ay - by;
  const am = a.getUTCMonth();
  const bm = b.getUTCMonth();
  if (am !== bm) return am - bm;
  return a.getUTCDate() - b.getUTCDate();
}

function firstDayOfUtcMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function clampDayToPresent(date, todayUtc) {
  return compareUtcDateOnly(date, todayUtc) > 0 ? todayUtc : date;
}

function clampMonthYearToPresent(year, month, todayUtc) {
  let y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
  const currentYear = todayUtc.getUTCFullYear();
  const currentMonth = todayUtc.getUTCMonth() + 1;
  while (y > currentYear || (y === currentYear && m > currentMonth)) {
    y -= 1;
  }
  return { year: y, month: m };
}

function toIsoDateUTC(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function buildDayContext(date, source) {
  return {
    mode: "day",
    valueDate: toIsoDateUTC(date),
    startDate: toIsoDateUTC(date),
    endDateExclusive: toIsoDateUTC(addUtcDays(date, 1)),
    source
  };
}

function buildMonthContext(year, month, source, todayUtc) {
  const monthInfo = clampMonthYearToPresent(year, month, todayUtc);
  if (!monthInfo) return null;
  const start = toUtcDate(monthInfo.year, monthInfo.month, 1);
  if (!start) return null;
  let end = new Date(Date.UTC(Number(monthInfo.year), Number(monthInfo.month), 1));
  const tomorrow = addUtcDays(todayUtc, 1);
  if (compareUtcDateOnly(end, tomorrow) > 0) {
    end = tomorrow;
  }
  return {
    mode: "month",
    valueDate: null,
    startDate: toIsoDateUTC(start),
    endDateExclusive: toIsoDateUTC(end),
    source:
      monthInfo.year === Number(year) && monthInfo.month === Number(month)
        ? source
        : `${source}_clamped_past`
  };
}

export function parseQuestionDateContext(question, now = new Date()) {
  const raw = String(question || "");
  const q = raw
    .toLowerCase()
    .replace(/[,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!q) return null;

  const nowUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayMonthStart = firstDayOfUtcMonth(nowUtc);

  if (/\byesterday\b/.test(q)) {
    return buildDayContext(addUtcDays(nowUtc, -1), "relative_yesterday");
  }
  if (/\b(today|current day|todays)\b/.test(q)) {
    return buildDayContext(nowUtc, "relative_today");
  }
  if (/\b(last month|previous month)\b/.test(q)) {
    const prevMonth = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth() - 1, 1));
    return buildMonthContext(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth() + 1, "relative_last_month", nowUtc);
  }
  if (/\b(this month|current month)\b/.test(q)) {
    return buildMonthContext(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth() + 1, "relative_this_month", nowUtc);
  }

  const isoMatch = q.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const dt = toUtcDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    if (dt) return buildDayContext(clampDayToPresent(dt, nowUtc), "explicit_iso_date");
  }

  const slashMatch = q.match(/\b(\d{1,2})[\/](\d{1,2})[\/](20\d{2})\b/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    // Prefer day/month/year in this project context.
    const dt = toUtcDate(year, second, first) || toUtcDate(year, first, second);
    if (dt) return buildDayContext(clampDayToPresent(dt, nowUtc), "explicit_slash_date");
  }

  const monthRegex =
    "(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)";

  const dayMonthYear = q.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthRegex}\\s+(20\\d{2})\\b`));
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = MONTH_LOOKUP[String(dayMonthYear[2] || "").toLowerCase()];
    const year = Number(dayMonthYear[3]);
    const dt = toUtcDate(year, month, day);
    if (dt) return buildDayContext(clampDayToPresent(dt, nowUtc), "explicit_day_month_year");
  }

  const monthDayYear = q.match(new RegExp(`\\b${monthRegex}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(20\\d{2})\\b`));
  if (monthDayYear) {
    const month = MONTH_LOOKUP[String(monthDayYear[1] || "").toLowerCase()];
    const day = Number(monthDayYear[2]);
    const year = Number(monthDayYear[3]);
    const dt = toUtcDate(year, month, day);
    if (dt) return buildDayContext(clampDayToPresent(dt, nowUtc), "explicit_month_day_year");
  }

  const monthOf = q.match(new RegExp(`\\bmonth\\s+of\\s+${monthRegex}(?:\\s+(20\\d{2}))?\\b`));
  if (monthOf) {
    const month = MONTH_LOOKUP[String(monthOf[1] || "").toLowerCase()];
    const year = Number(monthOf[2] || nowUtc.getUTCFullYear());
    return buildMonthContext(year, month, "explicit_month_of", nowUtc);
  }

  const monthYear = q.match(new RegExp(`\\b${monthRegex}\\s+(20\\d{2})\\b`));
  if (monthYear) {
    const month = MONTH_LOOKUP[String(monthYear[1] || "").toLowerCase()];
    const year = Number(monthYear[2]);
    return buildMonthContext(year, month, "explicit_month_year", nowUtc);
  }

  const monthOnly = q.match(new RegExp(`\\b${monthRegex}\\b`));
  if (monthOnly) {
    const month = MONTH_LOOKUP[String(monthOnly[1] || "").toLowerCase()];
    if (month) {
      const defaultYear =
        month > nowUtc.getUTCMonth() + 1 ? nowUtc.getUTCFullYear() - 1 : nowUtc.getUTCFullYear();
      const monthContext = buildMonthContext(defaultYear, month, "explicit_month", nowUtc);
      if (monthContext && compareUtcDateOnly(toUtcDate(Number(defaultYear), Number(month), 1), todayMonthStart) > 0) {
        monthContext.source = "explicit_month_clamped_past";
      }
      return monthContext;
    }
  }

  return null;
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
  const dateContext = parseQuestionDateContext(question, now);
  if (dateContext?.mode === "day" && dateContext.valueDate) {
    return { isTemporal: true, scopeKey: `day:${dateContext.valueDate}` };
  }
  if (dateContext?.mode === "month" && dateContext.startDate) {
    return { isTemporal: true, scopeKey: `month:${dateContext.startDate.slice(0, 7)}` };
  }

  const explicitYearMatch = q.match(/\b(20\d{2})\b/);
  const explicitYear = explicitYearMatch ? Number(explicitYearMatch[1]) : null;
  const monthMatch = q.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/
  );
  const monthNumber = monthMatch ? MONTH_LOOKUP[monthMatch[1]] : null;

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

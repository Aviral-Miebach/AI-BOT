import crypto from "node:crypto";

export function normalizeQuestion(question) {
  return String(question || "")
    .trim()
    .toLowerCase()
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
  const body = String(text || "").trim();
  const start = body.indexOf("{");
  if (start === -1) {
    throw new Error("Model output is not valid JSON");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < body.length; i += 1) {
    const ch = body[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(body.slice(start, i + 1));
      }
    }
  }

  throw new Error("Model output is not valid JSON");
}

export function parseGeminiUsage(response) {
  const usage = response?.response?.usageMetadata || response?.usageMetadata || {};
  return {
    inputTokens: Number(usage.promptTokenCount || 0),
    outputTokens: Number(usage.candidatesTokenCount || 0)
  };
}

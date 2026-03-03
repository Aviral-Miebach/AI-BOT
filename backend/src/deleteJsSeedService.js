import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DELETE_JS_PATH = path.resolve(__dirname, "delete.js");

const DEFAULT_MAX_SEED_CHARS = 7000;
const DEFAULT_MAX_SCHEMA_LINES = 24;
const DEFAULT_MAX_EXAMPLES = 12;

let cache = {
  seedText: "",
  loadedAtMs: 0,
  sourceMtimeMs: 0
};

function normalizeSeedText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/â€”/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTemplateBlocks(source, varName) {
  const blocks = [];
  const pattern = new RegExp(`const\\s+${varName}\\s*=\\s*\\\`([\\s\\S]*?)\\\`;`, "g");
  let match = pattern.exec(source);
  while (match) {
    blocks.push(String(match[1] || "").trim());
    match = pattern.exec(source);
  }
  return blocks;
}

function pickSchemaLines(schemaBlocks) {
  const lines = [];
  const seen = new Set();

  for (const block of schemaBlocks) {
    const blockLines = String(block || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of blockLines) {
      if (!/^-\s*public\./i.test(line)) continue;
      const normalized = line.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      lines.push(line);
      if (lines.length >= DEFAULT_MAX_SCHEMA_LINES) {
        return lines;
      }
    }
  }

  return lines;
}

function pickExampleSnippets(exampleBlocks) {
  const snippets = [];

  for (const block of exampleBlocks) {
    const parts = String(block || "").split(/\n(?=--\s*Example\b)/i);
    for (const rawPart of parts) {
      const part = rawPart.trim();
      if (!part) continue;
      if (!/^\s*--\s*Example\b/i.test(part)) continue;
      if (!/\bselect\b|\bwith\b/i.test(part)) continue;

      const lines = part
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0)
        .slice(0, 18);
      const clipped = lines.join("\n").trim();
      if (!clipped) continue;

      snippets.push(clipped);
      if (snippets.length >= DEFAULT_MAX_EXAMPLES) {
        return snippets;
      }
    }
  }

  return snippets;
}

function clipSeed(text) {
  const maxChars = Math.max(500, Number(config.deleteJsSeedMaxChars || DEFAULT_MAX_SEED_CHARS));
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...`;
}

function buildSeedFromSource(sourceText) {
  const schemaBlocks = extractTemplateBlocks(sourceText, "SCHEMA");
  const exampleBlocks = extractTemplateBlocks(sourceText, "EXAMPLES");

  const schemaLines = pickSchemaLines(schemaBlocks);
  const examples = pickExampleSnippets(exampleBlocks);

  if (schemaLines.length === 0 && examples.length === 0) {
    return "";
  }

  const schemaText = schemaLines.length
    ? `DELETE_JS_SCHEMA_HINTS:\n${schemaLines.map((line) => `- ${line.replace(/^-+\s*/, "")}`).join("\n")}`
    : "";

  const exampleText = examples.length
    ? `DELETE_JS_FEW_SHOT_SQL:\n${examples
        .map((snippet, idx) => `Example_${idx + 1}:\n${snippet}`)
        .join("\n\n")}`
    : "";

  return [schemaText, exampleText].filter(Boolean).join("\n\n");
}

export function getDeleteJsPromptSeed() {
  if (!config.deleteJsSeedEnabled) {
    return "";
  }

  try {
    const stat = fs.statSync(DELETE_JS_PATH);
    const now = Date.now();
    const cacheValid =
      cache.seedText &&
      cache.sourceMtimeMs === Number(stat.mtimeMs || 0) &&
      now - cache.loadedAtMs < Number(config.deleteJsSeedCacheTtlMs || 5 * 60 * 1000);

    if (cacheValid) {
      return cache.seedText;
    }

    const raw = fs.readFileSync(DELETE_JS_PATH, "utf8");
    const built = buildSeedFromSource(raw);
    const normalized = clipSeed(normalizeSeedText(built));

    cache = {
      seedText: normalized,
      loadedAtMs: now,
      sourceMtimeMs: Number(stat.mtimeMs || 0)
    };

    return cache.seedText;
  } catch {
    return "";
  }
}

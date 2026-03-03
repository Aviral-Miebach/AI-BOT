import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";
import { parseGeminiUsage, parseJsonObject } from "./utils.js";

const geminiApiKey = String(config.geminiApiKey || "")
  .trim()
  .replace(/^['"]|['"]$/g, "");
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const staticFallbackModels = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-pro-latest"
];
let resolvedModelName = null;

function normalizeModelName(name) {
  return String(name || "")
    .trim()
    .replace(/^models\//i, "");
}

function requireClient() {
  if (!genAI) {
    throw new Error("Missing GEMINI_API_KEY in environment");
  }
}

function getErrorMessage(error) {
  if (!error) return "";
  return String(error.message || error).trim();
}

function isInvalidArgumentError(error) {
  const message = getErrorMessage(error).toLowerCase();
  return /invalid argument|responsemime|unknown field|bad request|400/.test(message);
}

function isRetryableGeminiError(error) {
  const message = getErrorMessage(error).toLowerCase();
  return /not found|unsupported|permission|forbidden|rate limit|quota|timeout|service unavailable|429|500|502|503|504|network|fetch failed|econnreset|enotfound/.test(
    message
  );
}

function wrapGeminiError(error, model, stage) {
  const message = getErrorMessage(error) || "Unknown Gemini error";
  return new Error(`GoogleGenerativeAI error (${stage}, model=${model}): ${message}`);
}

async function discoverModelName() {
  const fallbackModel = normalizeModelName(config.geminiSqlModel || "gemini-2.5-flash");
  if (!geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment");
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiApiKey)}`
    );
    if (!response.ok) {
      console.warn(
        `Gemini model discovery failed (${response.status} ${response.statusText}). Using fallback model: ${fallbackModel}`
      );
      return fallbackModel;
    }

    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];
    const supportsGenerate = models.filter(
      (m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent")
    );

    const preferred = supportsGenerate.find((m) => m.name === `models/${fallbackModel}`);
    if (preferred) return preferred.name.replace(/^models\//, "");

    const flash = supportsGenerate.find((m) => /gemini-.*flash/i.test(m.name));
    if (flash) return flash.name.replace(/^models\//, "");

    const gemini = supportsGenerate.find((m) => /gemini/i.test(m.name));
    if (gemini) return gemini.name.replace(/^models\//, "");

    return fallbackModel;
  } catch (error) {
    console.warn(`Gemini model discovery error. Using fallback model: ${fallbackModel}`, getErrorMessage(error));
    return fallbackModel;
  }
}

function getModelCandidates(primaryModel) {
  const seen = new Set();
  const ordered = [
    primaryModel,
    normalizeModelName(config.geminiSqlModel),
    normalizeModelName(config.geminiAnswerModel),
    ...((config.geminiFallbackModels || []).map(normalizeModelName)),
    ...staticFallbackModels
  ].filter(Boolean);

  const unique = [];
  for (const name of ordered) {
    if (seen.has(name)) continue;
    seen.add(name);
    unique.push(name);
  }
  return unique;
}

async function generateContentWithFallback({ stage, model, contents, generationConfig }) {
  requireClient();

  const normalizedRequested = normalizeModelName(model);
  if (!resolvedModelName) {
    resolvedModelName = await discoverModelName();
  }
  const candidates = getModelCandidates(normalizedRequested || resolvedModelName);
  let lastError = null;

  for (const modelName of candidates) {
    const genModel = genAI.getGenerativeModel({ model: modelName });
    try {
      const completion = await genModel.generateContent({ contents, generationConfig });
      resolvedModelName = modelName;
      return completion;
    } catch (error) {
      lastError = error;

      // Some models reject responseMimeType even though generation succeeds.
      if (generationConfig?.responseMimeType && isInvalidArgumentError(error)) {
        try {
          const relaxedConfig = { ...generationConfig };
          delete relaxedConfig.responseMimeType;
          const completion = await genModel.generateContent({ contents, generationConfig: relaxedConfig });
          resolvedModelName = modelName;
          return completion;
        } catch (retryError) {
          lastError = retryError;
        }
      }

      if (!isRetryableGeminiError(lastError)) {
        throw wrapGeminiError(lastError, modelName, stage);
      }
    }
  }

  throw wrapGeminiError(lastError, candidates[0] || normalizedRequested || "unknown", stage);
}

export async function geminiGenerateJson({ model, prompt }) {
  const response = await generateContentWithFallback({
    stage: "json_generation",
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json" }
  });

  const text = response?.response?.text?.() || "{}";
  const usage = parseGeminiUsage(response);

  try {
    const json = parseJsonObject(text);
    return { json, usage, rawText: text };
  } catch (_parseError) {
    // Repair pass: force conversion to strict JSON if model emitted noisy text.
    const repairPrompt =
      "Convert the following model output into strict valid JSON.\n" +
      "Return only JSON, no markdown, no commentary.\n\n" +
      `OUTPUT_TO_REPAIR:\n${text}`;

    const repairedResponse = await generateContentWithFallback({
      stage: "json_repair",
      model,
      contents: [{ role: "user", parts: [{ text: repairPrompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" }
    });

    const repairedText = repairedResponse?.response?.text?.() || "{}";
    const repairedJson = parseJsonObject(repairedText);
    const repairedUsage = parseGeminiUsage(repairedResponse);

    return {
      json: repairedJson,
      usage: {
        inputTokens: usage.inputTokens + repairedUsage.inputTokens,
        outputTokens: usage.outputTokens + repairedUsage.outputTokens
      },
      rawText: text,
      repairedRawText: repairedText
    };
  }
}

export async function geminiEmbedText(text) {
  requireClient();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiEmbeddingModel}:embedContent`;
  const payload = {
    model: `models/${config.geminiEmbeddingModel}`,
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: config.embeddingDimensions
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiApiKey
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini embedding failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Gemini embedding returned empty vector");
  }
  return values;
}

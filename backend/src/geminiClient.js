import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";
import { parseGeminiUsage, parseJsonObject } from "./utils.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function geminiGenerateJson({ model, prompt }) {
  const genModel = genAI.getGenerativeModel({ model });
  const response = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json" }
  });

  const text = response?.response?.text?.() || "{}";
  const json = parseJsonObject(text);
  const usage = parseGeminiUsage(response);
  return { json, usage, rawText: text };
}

export async function geminiEmbedText(text) {
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
      "x-goog-api-key": config.geminiApiKey
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

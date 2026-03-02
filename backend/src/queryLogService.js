export async function insertQueryLog(pool, payload) {
  try {
    await pool.query(
      `
      INSERT INTO query_logs (
        request_id, user_id, tenant_id, question_text, normalized_question, cache_layer_hit,
        semantic_score, sql_generated, sql_safe, sql_text, row_count,
        gemini_calls, input_tokens, output_tokens, estimated_cost_usd,
        latency_ms, status, error_text, metadata
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19::jsonb
      )
      ON CONFLICT (request_id) DO NOTHING
      `,
      [
        payload.requestId,
        payload.userId || null,
        payload.tenantId || null,
        payload.questionText || "",
        payload.normalizedQuestion || "",
        payload.cacheLayerHit || "none",
        payload.semanticScore ?? null,
        Boolean(payload.sqlGenerated),
        Boolean(payload.sqlSafe),
        payload.sqlText || null,
        Number.isFinite(payload.rowCount) ? payload.rowCount : null,
        Number(payload.geminiCalls || 0),
        Number(payload.inputTokens || 0),
        Number(payload.outputTokens || 0),
        Number(payload.estimatedCostUsd || 0),
        Number(payload.latencyMs || 0),
        payload.status || "success",
        payload.errorText || null,
        JSON.stringify(payload.metadata || {})
      ]
    );
  } catch (error) {
    console.error("Failed to insert query_logs row:", error.message);
  }
}

export function estimateGeminiCostUsd({ inputTokens, outputTokens, usdPerInput1k = 0.00015, usdPerOutput1k = 0.0006 }) {
  const inCost = (Number(inputTokens || 0) / 1000) * usdPerInput1k;
  const outCost = (Number(outputTokens || 0) / 1000) * usdPerOutput1k;
  return Number((inCost + outCost).toFixed(6));
}


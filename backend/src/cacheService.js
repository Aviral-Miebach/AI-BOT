import { config } from "./config.js";
import { toVectorLiteral } from "./utils.js";
import { getRedisJson, setRedisJson } from "./redisClient.js";

export function exactCacheKey(questionHash) {
  return `qa:exact:${questionHash}`;
}

export async function getExactCache(questionHash) {
  return getRedisJson(exactCacheKey(questionHash));
}

export async function setExactCache(questionHash, payload) {
  await setRedisJson(exactCacheKey(questionHash), payload, config.redisExactTtlSec);
}

export async function findSemanticCache(pool, embedding) {
  const vector = toVectorLiteral(embedding);
  const result = await pool.query(
    `
      SELECT
        id,
        answer_payload,
        answer_text,
        entities,
        intent,
        sql_text,
        sql_params,
        1 - (question_embedding <=> $1::vector) AS score
      FROM question_answer_cache
      WHERE expires_at > now()
      ORDER BY question_embedding <=> $1::vector
      LIMIT 1
    `,
    [vector]
  );
  return result.rows[0] || null;
}

export async function storeSemanticCache({
  pool,
  normalizedQuestion,
  questionHash,
  embedding,
  intent,
  entities,
  sqlText,
  sqlParams,
  answerText,
  answerPayload,
  confidence,
  sourceFingerprint
}) {
  const vector = toVectorLiteral(embedding);
  await pool.query(
    `
      INSERT INTO question_answer_cache (
        normalized_question,
        question_hash,
        question_embedding,
        intent,
        entities,
        sql_text,
        sql_params,
        answer_text,
        answer_payload,
        confidence,
        source_fingerprint,
        expires_at
      )
      VALUES (
        $1, $2, $3::vector, $4, $5::jsonb, $6, $7::jsonb, $8, $9::jsonb, $10, $11, now() + make_interval(hours => $12)
      )
      ON CONFLICT (question_hash) DO UPDATE
      SET
        question_embedding = EXCLUDED.question_embedding,
        intent = EXCLUDED.intent,
        entities = EXCLUDED.entities,
        sql_text = EXCLUDED.sql_text,
        sql_params = EXCLUDED.sql_params,
        answer_text = EXCLUDED.answer_text,
        answer_payload = EXCLUDED.answer_payload,
        confidence = EXCLUDED.confidence,
        source_fingerprint = EXCLUDED.source_fingerprint,
        expires_at = EXCLUDED.expires_at,
        last_hit_at = now()
    `,
    [
      normalizedQuestion,
      questionHash,
      vector,
      intent,
      JSON.stringify(entities || {}),
      sqlText || null,
      JSON.stringify(sqlParams || []),
      answerText,
      JSON.stringify(answerPayload || {}),
      confidence || 0,
      sourceFingerprint,
      config.semanticTtlHours
    ]
  );
}

export async function markSemanticHit(pool, id) {
  if (!id) return;
  await pool.query(
    `
      UPDATE question_answer_cache
      SET hit_count = hit_count + 1, last_hit_at = now()
      WHERE id = $1
    `,
    [id]
  );
}


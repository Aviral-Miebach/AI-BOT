import express from "express";
import cors from "cors";
import crypto, { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { assertCoreConfig, config } from "./config.js";
import { loadSchemaInfo } from "./schemaService.js";
import { geminiEmbedText } from "./geminiClient.js";
import { generateGroundedAnswer, generateSqlPlan } from "./aiFlow.js";
import { detectIntentAndEntities, isEntityCompatible, looksLikeStructuredQuestion } from "./intentService.js";
import { validateReadOnlySql } from "./sqlSafety.js";
import { normalizeSqlTableRefs } from "./sqlNormalize.js";
import { formatRagContext, retrieveRagChunks } from "./ragService.js";
import {
  findSemanticCache,
  getExactCache,
  markSemanticHit,
  setExactCache,
  storeSemanticCache
} from "./cacheService.js";
import { estimateGeminiCostUsd, insertQueryLog } from "./queryLogService.js";
import { getCacheScopeForQuestion, normalizeQuestion } from "./utils.js";
import { hasRedis } from "./redisClient.js";
import {
  applyStatusProcessLogic,
  buildSqlRetryHint,
  evaluateResultQuality,
  isRetryableDbError,
  tryFastKpiLookup,
  tryAmbiguousMultiTableLookup,
  tryEntityLookupWithoutTable,
  tryExplicitTableLookup,
  tryStatusStateCountLookup
} from "./heuristicService.js";

const app = express();
const port = config.port;

function recoverAnswerFromRows(payload) {
  const data = payload || {};
  const answer = String(data.answer || "").trim();
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const rowCount = Number(data.rowCount || rows.length || 0);
  if (answer && answer.toLowerCase() !== "unable to generate answer.") return data;
  if (rowCount <= 0 || rows.length === 0) return { ...data, answer: "No matching records were found." };
  const sample = rows.slice(0, 3).map((r) => JSON.stringify(r)).join("; ");
  const healedAnswer =
    rowCount <= 3 ? `Found ${rowCount} row(s): ${sample}` : `Found ${rowCount} row(s). Top rows: ${sample}`;
  return { ...data, answer: healedAnswer };
}

function pickBetterAttempt(best, candidate) {
  if (!best) return candidate;
  if ((candidate?.quality?.score || 0) > (best?.quality?.score || 0)) return candidate;
  if ((candidate?.quality?.score || 0) < (best?.quality?.score || 0)) return best;
  if ((candidate?.result?.rowCount || 0) > (best?.result?.rowCount || 0)) return candidate;
  return best;
}

function mapErrorToHttp(error) {
  const msg = String(error?.message || "");
  if (msg.includes("Too Many Requests") || msg.includes("[429")) {
    return {
      status: 429,
      error: "Gemini quota exceeded",
      details:
        "Gemini request quota is exhausted for this project/model. Wait for quota reset or enable billing/increase quota."
    };
  }
  return {
    status: 500,
    error: "Unexpected server error",
    details: msg || "Unknown server error"
  };
}

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, redis: hasRedis() });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Database connection failed", details: error.message });
  }
});

app.post("/ask", async (req, res) => {
  const startedAt = Date.now();
  const requestId = randomUUID();
  let cacheLayerHit = "none";
  let semanticScore = null;
  let sqlGenerated = false;
  let sqlSafe = false;
  let sqlText = null;
  let rowCount = 0;
  let geminiCalls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let normalizedQuestion = "";
  let cacheScopeKey = "static";

  try {
    const { question } = req.body || {};
    if (!String(question || "").trim()) {
      return res.status(400).json({ error: "Question is required." });
    }

    normalizedQuestion = normalizeQuestion(question);
    const cacheScope = getCacheScopeForQuestion(question, new Date());
    cacheScopeKey = cacheScope.scopeKey;
    const scopedQuestion = `${normalizedQuestion}|${cacheScope.scopeKey}`;
    const questionHash = crypto.createHash("sha256").update(scopedQuestion).digest("hex");

    const exactHit = await getExactCache(questionHash);
    if (exactHit) {
      const exactSql = String(exactHit.sql || "").trim();
      const exactRows = Array.isArray(exactHit.rows) ? exactHit.rows : [];
      const exactRowCount = Number(exactHit.rowCount || exactRows.length || 0);
      const structuredLike = looksLikeStructuredQuestion(question);
      const isLikelyStaleStructuredMiss = structuredLike && !exactSql && exactRowCount === 0;

      if (isLikelyStaleStructuredMiss) {
        // Skip stale exact-cache misses for SQL-like questions and continue full pipeline.
      } else {
      cacheLayerHit = "redis_exact";
      const healed = recoverAnswerFromRows(exactHit);
      await insertQueryLog(pool, {
        requestId,
        questionText: question,
        normalizedQuestion,
        cacheLayerHit,
        latencyMs: Date.now() - startedAt,
        status: "success"
      });
      return res.json({ requestId, ...healed, reused: "exact_cache" });
      }
    }

    // Fast deterministic KPI path: avoid Gemini/embedding latency for common dashboard questions.
    const fastKpi = await tryFastKpiLookup(pool, question);
    if (fastKpi?.result?.rowCount > 0) {
      const fastRows = fastKpi.result.rows || [];
      const fastRowCount = Number(fastKpi.result.rowCount || fastRows.length || 0);
      const payload = {
        answer: fastKpi.answer || "Done.",
        sql: fastKpi.sql || null,
        rowCount: fastRowCount,
        rows: fastRows
      };

      await setExactCache(questionHash, payload);

      await insertQueryLog(pool, {
        requestId,
        questionText: question,
        normalizedQuestion,
        cacheLayerHit,
        sqlGenerated: true,
        sqlSafe: true,
        sqlText: fastKpi.sql || null,
        rowCount: fastRowCount,
        geminiCalls,
        inputTokens,
        outputTokens,
        estimatedCostUsd: estimateGeminiCostUsd({ inputTokens, outputTokens }),
        latencyMs: Date.now() - startedAt,
        status: "success",
        metadata: { fastPath: "kpi_lookup", cacheScopeKey }
      });

      return res.json({
        requestId,
        ...payload,
        latencyMs: Date.now() - startedAt,
        cache: cacheLayerHit
      });
    }

    const embedding = await geminiEmbedText(normalizedQuestion);
    geminiCalls += 1;

    const { intent, entities } = detectIntentAndEntities(question);
    if (!cacheScope.isTemporal) {
      const semantic = await findSemanticCache(pool, embedding);
      if (semantic) {
        semanticScore = Number(semantic.score || 0);
        const reusable =
          semanticScore >= config.semanticThreshold &&
          semantic.intent === intent &&
          isEntityCompatible(entities, semantic.entities);

        if (reusable) {
          cacheLayerHit = "semantic";
          await markSemanticHit(pool, semantic.id);
          const payload = semantic.answer_payload || { answer: semantic.answer_text || "" };
          const healed = recoverAnswerFromRows(payload);
          await setExactCache(questionHash, healed);

          await insertQueryLog(pool, {
            requestId,
            questionText: question,
            normalizedQuestion,
            cacheLayerHit,
            semanticScore,
            latencyMs: Date.now() - startedAt,
            status: "success"
          });

          return res.json({ requestId, ...healed, reused: "semantic_cache", semanticScore });
        }
      }
    }

    const { text: schemaText, rulesText: schemaRulesText, tables: schemaTables, tableMap, columnMap } = await loadSchemaInfo(pool);
    const allowAllTables = config.allowedTables.includes("*");
    const allowedTables = config.enforceAllowlist
      ? allowAllTables
        ? schemaTables
        : config.allowedTables
      : schemaTables;

    const ragChunks = await retrieveRagChunks(pool, embedding).catch(() => []);
    const ragContext = formatRagContext(ragChunks);

    let rows = [];
    let sqlParams = [];
    let heuristicAnswer = "";

    const forceStructuredFallback = looksLikeStructuredQuestion(question);
    const usedStructuredPath = intent === "structured_query" || forceStructuredFallback;
    if (usedStructuredPath) {
      const runReadOnlyQuery = async (queryText, params) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN READ ONLY");
          await client.query(`SET LOCAL statement_timeout = '${config.sqlTimeoutMs}ms'`);
          const result = await client.query(queryText, params);
          await client.query("COMMIT");
          return result;
        } catch (dbError) {
          await client.query("ROLLBACK");
          throw dbError;
        } finally {
          client.release();
        }
      };

      // First, try deterministic heuristics for common intent patterns.
      const statusStateLookup = await tryStatusStateCountLookup(pool, question);
      if (statusStateLookup?.result?.rowCount > 0) {
        sqlText = statusStateLookup.sql;
        sqlParams = statusStateLookup.params || [];
        rows = statusStateLookup.result.rows;
        rowCount = statusStateLookup.result.rowCount;
        heuristicAnswer = statusStateLookup.answer || "";
        sqlGenerated = true;
        sqlSafe = true;
      }

      // Explicit table lookups should run before ambiguous and LLM paths.
      if (!heuristicAnswer && rowCount === 0) {
        const explicitLookup = await tryExplicitTableLookup(pool, question);
        if (explicitLookup?.result?.rowCount > 0) {
          sqlText = explicitLookup.sql;
          sqlParams = explicitLookup.params || [];
          rows = explicitLookup.result.rows;
          rowCount = explicitLookup.result.rowCount;
          sqlGenerated = true;
          sqlSafe = true;
        }
      }

      if (!heuristicAnswer && rowCount === 0) {
        const multiTableLookup = await tryAmbiguousMultiTableLookup(pool, question);
        if (multiTableLookup?.result?.rowCount > 0) {
          sqlText = multiTableLookup.sql;
          sqlParams = multiTableLookup.params || [];
          rows = multiTableLookup.result.rows;
          rowCount = multiTableLookup.result.rowCount;
          heuristicAnswer = multiTableLookup.answer || "";
          sqlGenerated = true;
          sqlSafe = true;
        }
      }

      // LLM SQL generation with multi-attempt quality loop.
      if (!heuristicAnswer && rowCount === 0) {
        let bestAttempt = null;
        let previousHint = "";
        let lastRetryableDbError = null;
        let lastValidationReason = "";

        for (let attempt = 1; attempt <= config.maxSqlAttempts; attempt += 1) {
          const sqlResult = await generateSqlPlan({
            question,
            schemaText,
            schemaRulesText,
            ragContext,
            allowedTables,
            previousError: previousHint,
            previousSql: sqlText || ""
          });
          geminiCalls += 1;
          inputTokens += sqlResult.usage.inputTokens;
          outputTokens += sqlResult.usage.outputTokens;

          const candidateSql = normalizeSqlTableRefs(sqlResult.sql, tableMap, columnMap);
          const candidateParams = sqlResult.params || [];
          sqlGenerated = true;

          const validation = validateReadOnlySql(candidateSql, candidateParams, allowedTables);
          if (!validation.ok) {
            lastValidationReason = validation.reason || "validation_failed";
            previousHint = buildSqlRetryHint({
              generatedSql: candidateSql,
              dbError: { code: "VALIDATOR", message: validation.reason }
            });
            continue;
          }

          sqlSafe = true;
          try {
            const result = await runReadOnlyQuery(validation.sql, candidateParams);
            const quality = evaluateResultQuality(question, result);
            bestAttempt = pickBetterAttempt(bestAttempt, {
              sql: validation.sql,
              params: candidateParams,
              result,
              quality
            });

            if (quality.status === "good") {
              break;
            }
            previousHint = buildSqlRetryHint({ generatedSql: validation.sql, quality });
          } catch (dbError) {
            if (!isRetryableDbError(dbError)) {
              throw dbError;
            }
            lastRetryableDbError = dbError;
            previousHint = buildSqlRetryHint({ generatedSql: validation.sql, dbError });
          }
        }

        if (!bestAttempt && lastRetryableDbError) {
          throw lastRetryableDbError;
        }
        if (!bestAttempt && lastValidationReason) {
          return res.status(403).json({ requestId, answer: "Query not permitted." });
        }

        if (bestAttempt) {
          sqlText = bestAttempt.sql;
          sqlParams = bestAttempt.params;
          rows = bestAttempt.result.rows;
          rowCount = bestAttempt.result.rowCount;
        }
      }

      // Fallback heuristics when SQL result is empty.
      if (!heuristicAnswer && rowCount === 0) {
        const heuristicLookup = await tryEntityLookupWithoutTable(pool, question);
        if (heuristicLookup?.result?.rowCount > 0) {
          sqlText = heuristicLookup.sql;
          sqlParams = heuristicLookup.params || [];
          rows = heuristicLookup.result.rows;
          rowCount = heuristicLookup.result.rowCount;
          sqlGenerated = true;
          sqlSafe = true;
        }
      }

      if (rowCount > 0 && Array.isArray(rows) && rows.length > 0) {
        const statusLogic = await applyStatusProcessLogic(pool, { sql: sqlText, rows });
        if (statusLogic?.applied) {
          rows = statusLogic.rows;
          rowCount = rows.length;
        }
      }
    }

    let answerText = heuristicAnswer;
    if (!answerText) {
      const answerResult = await generateGroundedAnswer({
        question,
        sql: sqlText,
        params: sqlParams,
        rows,
        rowCount,
        ragContext
      });
      geminiCalls += 1;
      inputTokens += answerResult.usage.inputTokens;
      outputTokens += answerResult.usage.outputTokens;
      answerText = answerResult.answer;
    }

    const payload = {
      answer: answerText,
      sql: sqlText,
      rowCount,
      rows
    };

    await setExactCache(questionHash, payload);
    if (!cacheScope.isTemporal) {
      await storeSemanticCache({
        pool,
        normalizedQuestion,
        questionHash,
        embedding,
        intent,
        entities,
        sqlText,
        sqlParams,
        answerText,
        answerPayload: payload,
        confidence: semanticScore || 0,
        sourceFingerprint: config.sourceFingerprint
      });
    }

    await insertQueryLog(pool, {
      requestId,
      questionText: question,
      normalizedQuestion,
      cacheLayerHit,
      semanticScore,
      sqlGenerated,
      sqlSafe,
      sqlText,
      rowCount,
      geminiCalls,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateGeminiCostUsd({ inputTokens, outputTokens }),
      latencyMs: Date.now() - startedAt,
      status: "success",
      metadata: { intent, entities, usedStructuredPath, forceStructuredFallback, cacheScopeKey }
    });

    return res.json({
      requestId,
      ...payload,
      latencyMs: Date.now() - startedAt,
      cache: cacheLayerHit
    });
  } catch (error) {
    await insertQueryLog(pool, {
      requestId,
      questionText: req.body?.question || "",
      normalizedQuestion,
      cacheLayerHit,
      semanticScore,
      sqlGenerated,
      sqlSafe,
      sqlText,
      rowCount,
      geminiCalls,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateGeminiCostUsd({ inputTokens, outputTokens }),
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorText: error.message
    });

    const mapped = mapErrorToHttp(error);
    return res.status(mapped.status).json({
      requestId,
      error: mapped.error,
      details: mapped.details
    });
  }
});

app.post("/feedback", async (req, res) => {
  try {
    const { requestId, cacheId, rating, isCorrect, userComment, correctionText, metadata } = req.body || {};
    if (!requestId || !Number.isFinite(Number(rating))) {
      return res.status(400).json({ error: "requestId and rating are required." });
    }

    await pool.query(
      `
      INSERT INTO feedback (
        request_id, cache_id, rating, is_correct, user_comment, correction_text, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [
        requestId,
        cacheId || null,
        Number(rating),
        typeof isCorrect === "boolean" ? isCorrect : null,
        userComment || null,
        correctionText || null,
        JSON.stringify(metadata || {})
      ]
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save feedback.", details: error.message });
  }
});

app.post("/admin/cache/invalidate", async (req, res) => {
  try {
    const { sourceFingerprint } = req.body || {};
    if (!sourceFingerprint) {
      return res.status(400).json({ error: "sourceFingerprint is required." });
    }

    const result = await pool.query(`DELETE FROM question_answer_cache WHERE source_fingerprint = $1`, [
      sourceFingerprint
    ]);

    return res.json({ ok: true, deleted: result.rowCount });
  } catch (error) {
    return res.status(500).json({ error: "Failed to invalidate cache.", details: error.message });
  }
});

assertCoreConfig();

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

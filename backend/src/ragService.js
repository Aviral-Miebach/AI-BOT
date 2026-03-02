import { config } from "./config.js";
import { toVectorLiteral } from "./utils.js";

export async function retrieveRagChunks(pool, embedding) {
  const vector = toVectorLiteral(embedding);
  const result = await pool.query(
    `
      SELECT id, chunk_text, metadata, 1 - (embedding <=> $1::vector) AS score
      FROM documents
      WHERE is_active = TRUE
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
    [vector, config.ragTopK]
  );

  return result.rows.filter((row) => Number(row.score) >= config.ragMinScore);
}

export function formatRagContext(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) return "No additional context.";
  return chunks
    .map((chunk, index) => {
      const score = Number(chunk.score || 0).toFixed(3);
      return `Chunk ${index + 1} (score=${score}): ${chunk.chunk_text}`;
    })
    .join("\n");
}


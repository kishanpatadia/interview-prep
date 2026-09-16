import { getAllQuestions } from '../storage/db.js';

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieves the top-K most similar questions to a query embedding.
 * Simple in-memory cosine search — fine for a personal question bank
 * (hundreds to low thousands of rows). Swap for Chroma/Qdrant if the
 * corpus grows large enough that this becomes a bottleneck.
 */
export function similaritySearch(queryEmbedding, topK = 5, excludeIds = []) {
  const all = getAllQuestions().filter((q) => !excludeIds.includes(q.id));
  const scored = all.map((q) => ({
    ...q,
    similarity: cosineSimilarity(queryEmbedding, q.embedding),
  }));
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

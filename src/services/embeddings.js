import { config } from '../config.js';
import { guardVoyageCall } from './usageGuard.js';

/**
 * Gets an embedding vector for a piece of text via Voyage AI.
 * Voyage is a natural pairing with Claude for RAG (same ecosystem, cheap, good quality).
 */
export async function embed(text, inputType = 'document') {
  guardVoyageCall(); // throws DailyLimitError if today's cap is hit
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.voyage.apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: config.voyage.model,
      input_type: inputType, // 'document' when storing, 'query' when searching
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Voyage embeddings request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

export async function embedBatch(texts, inputType = 'document') {
  guardVoyageCall(); // one guard check per batch call
  // Voyage supports batched input directly
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.voyage.apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: config.voyage.model,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Voyage embeddings batch request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

import { getMany } from '../db/client';
import { embedText } from '../ai/llm-client';

/**
 * Signal Deduplication
 * 
 * Detects and handles duplicate or near-duplicate signals.
 * Uses both exact text matching and semantic similarity.
 * 
 * This is important because:
 * - Users might accidentally submit the same signal twice
 * - Offline queue sync might create duplicates
 * - Webhook retries might resend the same signal
 * 
 * Strategy:
 * 1. Exact text match → merge (don't create new signal)
 * 2. High semantic similarity (>0.95) → warn but allow
 * 3. Medium similarity (0.8-0.95) → create as related
 * 4. Low similarity (<0.8) → create as independent
 */

export interface DedupResult {
  isDuplicate: boolean;
  duplicateOf?: string;
  similarity: number;
  action: 'merge' | 'warn' | 'relate' | 'create';
  relatedSignals: Array<{ id: string; text: string; similarity: number }>;
}

export async function checkDuplicate(
  text: string,
  windowMinutes: number = 60,
): Promise<DedupResult> {
  // 1. Exact text match in recent window
  const exactMatch = await getMany<any>(
    `SELECT id, normalized_text FROM signals
     WHERE normalized_text = $1 AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'
     LIMIT 1`,
    [text]
  );

  if (exactMatch.length > 0) {
    return {
      isDuplicate: true,
      duplicateOf: exactMatch[0].id,
      similarity: 1.0,
      action: 'merge',
      relatedSignals: [],
    };
  }

  // 2. Semantic similarity check
  let embedding: number[] | null = null;
  try {
    embedding = await embedText(text);
  } catch {
    // Can't compute embedding — allow the signal
    return { isDuplicate: false, similarity: 0, action: 'create', relatedSignals: [] };
  }

  const embStr = `[${embedding.join(',')}]`;
  const similar = await getMany<any>(
    `SELECT id, normalized_text, 1 - (embedding <=> $1::vector) as similarity
     FROM signals
     WHERE embedding IS NOT NULL AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    [embStr]
  );

  const topMatch = similar[0];
  if (!topMatch) {
    return { isDuplicate: false, similarity: 0, action: 'create', relatedSignals: [] };
  }

  const relatedSignals = similar
    .filter((s: any) => s.similarity > 0.5)
    .map((s: any) => ({ id: s.id, text: s.normalized_text?.slice(0, 100), similarity: s.similarity }));

  if (topMatch.similarity > 0.95) {
    return {
      isDuplicate: true,
      duplicateOf: topMatch.id,
      similarity: topMatch.similarity,
      action: 'warn',
      relatedSignals,
    };
  }

  if (topMatch.similarity > 0.8) {
    return {
      isDuplicate: false,
      similarity: topMatch.similarity,
      action: 'relate',
      relatedSignals,
    };
  }

  return {
    isDuplicate: false,
    similarity: topMatch.similarity,
    action: 'create',
    relatedSignals,
  };
}

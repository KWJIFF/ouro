import { extractPatterns } from '../../services/pattern-extractor';
import { getOne, getMany } from '../../db/client';
import type { CapturedSignal, ParsedIntent, ExecutionPlan, Feedback } from '@ouro/core';

/**
 * Background worker that processes signal recovery asynchronously.
 * In production, this would be a BullMQ worker.
 * For MVP, it runs as an async function after each signal cycle.
 */

export async function runRecoveryWorker(signalId: string): Promise<void> {
  try {
    const signal = await getOne<CapturedSignal>('SELECT * FROM signals WHERE id = $1', [signalId]);
    if (!signal) return;

    const intent = await getOne<ParsedIntent>('SELECT * FROM intents WHERE signal_id = $1 LIMIT 1', [signalId]);
    if (!intent) return;

    const plan = await getOne<ExecutionPlan>(
      'SELECT * FROM execution_plans WHERE signal_id = $1 ORDER BY created_at DESC LIMIT 1',
      [signalId]
    );
    if (!plan) return;

    const feedbacks = await getMany<Feedback>('SELECT * FROM feedback WHERE signal_id = $1', [signalId]);

    const patterns = await extractPatterns(signal, intent, plan, feedbacks);
    console.log(`[Recovery] Extracted ${patterns.length} patterns from signal ${signalId}`);
  } catch (e) {
    console.error(`[Recovery] Worker failed for signal ${signalId}:`, e);
  }
}

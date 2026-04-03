import { checkAndRunEvolution } from '../../services/evolution-engine';

/**
 * Background worker that checks whether evolution should run.
 * In production: BullMQ scheduled job.
 * For MVP: called after each signal cycle.
 */

export async function runEvolutionWorker(): Promise<void> {
  try {
    await checkAndRunEvolution();
  } catch (e) {
    console.error('[Evolution Worker] Failed:', e);
  }
}

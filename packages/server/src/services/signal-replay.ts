import { getMany } from '../db/client';
import { captureSignal, updateSignalStatus } from './signal-capture';
import { parseIntent } from './intent-parser';
import { generatePlan } from './execution-planner';
import { executePlan } from './execution-runner';
import { buildArtifacts } from './artifact-builder';
import { extractPatterns } from './pattern-extractor';
import { generateId, now } from '@ouro/core';

/**
 * Signal Replay System
 * 
 * Replays historical signals through the current pipeline.
 * Used for:
 * 1. Testing prompt changes (compare old vs new results)
 * 2. Validating evolution improvements (A/B testing)
 * 3. Rebuilding artifacts after tool upgrades
 * 4. Benchmarking system performance
 * 5. Disaster recovery (rebuild from signal history)
 */

export interface ReplayOptions {
  signalIds?: string[];          // Specific signals to replay
  dateRange?: { from: string; to: string };
  limit?: number;
  dryRun?: boolean;              // Parse + plan but don't execute
  compareWithOriginal?: boolean; // Compare new results vs original
  onProgress?: (progress: ReplayProgress) => void;
}

export interface ReplayProgress {
  current: number;
  total: number;
  signalId: string;
  status: 'processing' | 'completed' | 'failed' | 'skipped';
  originalIntent?: string;
  replayedIntent?: string;
  intentMatch?: boolean;
  durationMs: number;
}

export interface ReplayResult {
  totalReplayed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  intentMatchRate: number;
  avgDurationMs: number;
  comparisons: Array<{
    signalId: string;
    originalIntent: string;
    replayedIntent: string;
    match: boolean;
    originalTool: string;
    replayedTool: string;
    toolMatch: boolean;
  }>;
}

export async function replaySignals(options: ReplayOptions): Promise<ReplayResult> {
  // Fetch signals to replay
  let signals: any[];

  if (options.signalIds?.length) {
    signals = await getMany(
      `SELECT * FROM signals WHERE id = ANY($1) ORDER BY created_at`,
      [options.signalIds]
    );
  } else if (options.dateRange) {
    signals = await getMany(
      `SELECT * FROM signals WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at LIMIT $3`,
      [options.dateRange.from, options.dateRange.to, options.limit || 100]
    );
  } else {
    signals = await getMany(
      `SELECT * FROM signals ORDER BY created_at DESC LIMIT $1`,
      [options.limit || 20]
    );
  }

  const result: ReplayResult = {
    totalReplayed: signals.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    intentMatchRate: 0,
    avgDurationMs: 0,
    comparisons: [],
  };

  let totalDurationMs = 0;
  let intentMatches = 0;

  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i];
    const startTime = Date.now();

    try {
      // Get original intent for comparison
      const originalIntents = await getMany(
        'SELECT * FROM intents WHERE signal_id = $1 LIMIT 1',
        [signal.id]
      );
      const originalIntent = originalIntents[0];

      // Get original plan for comparison
      const originalPlans = await getMany(
        'SELECT * FROM execution_plans WHERE signal_id = $1 LIMIT 1',
        [signal.id]
      );

      // Replay through current pipeline
      const replayedIntent = await parseIntent(signal);

      const comparison: any = {
        signalId: signal.id,
        originalIntent: originalIntent?.intent_type || 'unknown',
        replayedIntent: replayedIntent.intent_type,
        match: originalIntent?.intent_type === replayedIntent.intent_type,
        originalTool: originalPlans[0]?.plan_dag?.steps?.[0]?.tool || 'unknown',
        replayedTool: 'pending',
        toolMatch: false,
      };

      if (comparison.match) intentMatches++;

      if (!options.dryRun) {
        const plan = await generatePlan(replayedIntent);
        comparison.replayedTool = plan.steps[0]?.tool || 'unknown';
        comparison.toolMatch = comparison.originalTool === comparison.replayedTool;

        const executed = await executePlan(plan, signal.id);
        if (executed.status === 'completed') {
          result.succeeded++;
        } else {
          result.failed++;
        }
      } else {
        result.skipped++;
      }

      result.comparisons.push(comparison);

      const durationMs = Date.now() - startTime;
      totalDurationMs += durationMs;

      options.onProgress?.({
        current: i + 1,
        total: signals.length,
        signalId: signal.id,
        status: 'completed',
        originalIntent: comparison.originalIntent,
        replayedIntent: comparison.replayedIntent,
        intentMatch: comparison.match,
        durationMs,
      });

    } catch (error: any) {
      result.failed++;
      options.onProgress?.({
        current: i + 1,
        total: signals.length,
        signalId: signal.id,
        status: 'failed',
        durationMs: Date.now() - startTime,
      });
    }
  }

  result.intentMatchRate = signals.length > 0 ? intentMatches / signals.length : 0;
  result.avgDurationMs = signals.length > 0 ? Math.round(totalDurationMs / signals.length) : 0;

  return result;
}

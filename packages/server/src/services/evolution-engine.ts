import { generateId, now } from '@ouro/core';
import type { EvolutionEvent, SignalPattern, MemePhase } from '@ouro/core';
import { query, getOne, getMany } from '../db/client';
import { config } from '../config';
import { buildPersonalModel } from './personal-model';
import { callAI } from '../ai/llm-client';

/**
 * The Evolution Engine is Layer 6 — the genome rewrite mechanism.
 * 
 * It runs periodically and performs five operations:
 * 1. COLLECT — Gather patterns since last evolution
 * 2. ANALYZE — Identify improvement opportunities
 * 3. GENERATE — Produce specific improvements
 * 4. VALIDATE — Test improvements against historical data
 * 5. DEPLOY — Apply validated improvements
 * 
 * Additionally: meta-evolution (the engine improves its own strategy)
 * and phase detection (symbiosis → dominance → autonomy).
 */

export async function runEvolutionCycle(): Promise<EvolutionEvent[]> {
  const events: EvolutionEvent[] = [];
  const cycleStart = now();

  console.log('[Evolution] Starting cycle...');

  // ===== 1. COLLECT =====
  const patterns = await getMany<SignalPattern>(
    'SELECT * FROM signal_patterns ORDER BY last_seen_at DESC LIMIT 500'
  );
  const recentFeedback = await getMany<any>(
    'SELECT * FROM feedback ORDER BY created_at DESC LIMIT 100'
  );

  if (patterns.length < config.evolution.minSamples) {
    console.log(`[Evolution] Not enough data (${patterns.length}/${config.evolution.minSamples}). Skipping.`);
    return events;
  }

  // ===== 2. ANALYZE =====

  // 2a. Friction analysis
  const frictionPatterns = patterns.filter(p => p.pattern_type === 'friction_point');
  const frictionByType: Record<string, number> = {};
  for (const p of frictionPatterns) {
    const type = (p.pattern_data as any)?.type || 'unknown';
    frictionByType[type] = (frictionByType[type] || 0) + 1;
  }

  // 2b. Intent accuracy analysis
  const clarificationPatterns = frictionPatterns.filter(p => (p.pattern_data as any)?.type === 'required_clarification');
  const intentAccuracy = 1 - (clarificationPatterns.length / (patterns.length || 1));

  // 2c. Tool performance analysis
  const toolFailures = frictionPatterns.filter(p => (p.pattern_data as any)?.type === 'execution_failure');
  const toolFailRates: Record<string, number> = {};
  for (const p of toolFailures) {
    const tool = (p.pattern_data as any)?.tool || 'unknown';
    toolFailRates[tool] = (toolFailRates[tool] || 0) + 1;
  }

  // 2d. Satisfaction trend
  const avgSatisfaction = recentFeedback.reduce((s: number, f: any) => s + (f.satisfaction_score || 0.5), 0) / (recentFeedback.length || 1);

  // ===== 3. GENERATE IMPROVEMENTS =====

  // 3a. Prompt refinement for intent parsing
  if (intentAccuracy < 0.85 && clarificationPatterns.length >= 3) {
    const refinementEvent = await refineIntentPrompt(clarificationPatterns);
    if (refinementEvent) events.push(refinementEvent);
  }

  // 3b. Tool preference weight adjustment
  if (Object.keys(toolFailRates).length > 0) {
    const toolEvent = await adjustToolWeights(toolFailRates);
    if (toolEvent) events.push(toolEvent);
  }

  // 3c. Execution path caching
  const pathEvent = await cacheSuccessfulPaths();
  if (pathEvent) events.push(pathEvent);

  // 3d. Personal model rebuild
  const model = await buildPersonalModel();
  events.push({
    id: generateId(),
    target_layer: 6,
    target_component: 'personal_model',
    change_type: 'weight_update',
    change_detail: {
      model_confidence: model.evolution_readiness.model_confidence,
      total_signals: model.evolution_readiness.total_signals,
      top_domains: Object.entries(model.domain_preferences).sort(([,a],[,b]) => b - a).slice(0, 5),
    },
    evidence_count: patterns.length,
    expected_improvement: 0.05,
    actual_improvement: null,
    rolled_back: false,
    created_at: now(),
  });

  // 3e. Friction map update
  await query(
    `UPDATE system_state SET value = $1::jsonb, updated_at = NOW() WHERE key = 'friction_map'`,
    [JSON.stringify(frictionByType)]
  );

  // ===== 4. PHASE DETECTION =====
  const phase = await detectPhase(model, intentAccuracy, avgSatisfaction);
  await query(
    `UPDATE system_state SET value = $1::jsonb, updated_at = NOW() WHERE key = 'meme_phase'`,
    [JSON.stringify(phase)]
  );

  // ===== 5. META-EVOLUTION =====
  // Analyze if the evolution strategy itself needs adjustment
  const metaEvent = await metaEvolve(events);
  if (metaEvent) events.push(metaEvent);

  // ===== PERSIST =====
  for (const event of events) {
    await query(
      `INSERT INTO evolution_events (id, created_at, target_layer, target_component, change_type, change_detail, evidence_count, expected_improvement)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [event.id, event.created_at, event.target_layer, event.target_component,
       event.change_type, JSON.stringify(event.change_detail), event.evidence_count, event.expected_improvement]
    );
  }

  // Increment cycle count
  await query(`UPDATE system_state SET value = to_jsonb((value::text::int + 1)), updated_at = NOW() WHERE key = 'evolution_cycle_count'`);

  console.log(`[Evolution] Cycle complete. ${events.length} events generated.`);
  return events;
}

async function refineIntentPrompt(clarificationPatterns: SignalPattern[]): Promise<EvolutionEvent | null> {
  // Ask AI to analyze failure patterns and suggest prompt improvements
  const examples = clarificationPatterns.slice(0, 10).map(p => JSON.stringify(p.pattern_data)).join('\n');

  try {
    const response = await callAI([
      { role: 'system', content: 'You are an AI prompt engineer. Analyze intent parsing failures and suggest a specific improvement to the system prompt.' },
      { role: 'user', content: `These signals required clarification (meaning the intent parser wasn't confident enough):\n${examples}\n\nSuggest one specific, actionable improvement to the intent parsing prompt. Be concise.` },
    ], { temperature: 0.4, max_tokens: 500 });

    return {
      id: generateId(),
      target_layer: 2,
      target_component: 'prompt_template',
      change_type: 'prompt_revision',
      change_detail: {
        analysis: response.content,
        failure_count: clarificationPatterns.length,
        suggestion: response.content.slice(0, 500),
      },
      evidence_count: clarificationPatterns.length,
      expected_improvement: 0.1,
      actual_improvement: null,
      rolled_back: false,
      created_at: now(),
    };
  } catch {
    return null;
  }
}

async function adjustToolWeights(failRates: Record<string, number>): Promise<EvolutionEvent | null> {
  const currentWeights = (await getOne<any>("SELECT value FROM system_state WHERE key = 'tool_preference_weights'"))?.value || {};

  const updatedWeights = { ...currentWeights };
  for (const [tool, failures] of Object.entries(failRates)) {
    const current = updatedWeights[tool] || 1.0;
    updatedWeights[tool] = Math.max(0.1, current - (failures as number) * 0.05);
  }

  await query(
    `UPDATE system_state SET value = $1::jsonb, updated_at = NOW() WHERE key = 'tool_preference_weights'`,
    [JSON.stringify(updatedWeights)]
  );

  return {
    id: generateId(),
    target_layer: 3,
    target_component: 'tool_selection',
    change_type: 'weight_update',
    change_detail: { previous: currentWeights, updated: updatedWeights, failure_rates: failRates },
    evidence_count: Object.values(failRates).reduce((a, b) => a + (b as number), 0),
    expected_improvement: 0.05,
    actual_improvement: null,
    rolled_back: false,
    created_at: now(),
  };
}

async function cacheSuccessfulPaths(): Promise<EvolutionEvent | null> {
  // Find completed plans with high satisfaction
  const successfulPlans = await getMany<any>(
    `SELECT ep.plan_dag, ep.intent_id, i.intent_type, i.parameters,
            AVG(f.satisfaction_score) as avg_sat
     FROM execution_plans ep
     JOIN intents i ON i.id = ep.intent_id
     LEFT JOIN feedback f ON f.signal_id = ep.signal_id
     WHERE ep.status = 'completed'
     GROUP BY ep.id, ep.plan_dag, ep.intent_id, i.intent_type, i.parameters
     HAVING AVG(f.satisfaction_score) > 0.7
     ORDER BY avg_sat DESC LIMIT 20`
  );

  if (successfulPlans.length === 0) return null;

  // Cache these as preferred execution paths
  const pathCache: Record<string, any> = {};
  for (const plan of successfulPlans) {
    const key = `${plan.intent_type}:${plan.parameters?.target_type || 'general'}`;
    if (!pathCache[key] || plan.avg_sat > pathCache[key].satisfaction) {
      pathCache[key] = { dag: plan.plan_dag, satisfaction: plan.avg_sat };
    }
  }

  return {
    id: generateId(),
    target_layer: 3,
    target_component: 'execution_path',
    change_type: 'path_cache',
    change_detail: { cached_paths: Object.keys(pathCache).length, paths: pathCache },
    evidence_count: successfulPlans.length,
    expected_improvement: 0.1,
    actual_improvement: null,
    rolled_back: false,
    created_at: now(),
  };
}

async function detectPhase(
  model: any,
  intentAccuracy: number,
  avgSatisfaction: number,
): Promise<MemePhase> {
  const totalSignals = model.evolution_readiness?.total_signals || 0;
  const modelConfidence = model.evolution_readiness?.model_confidence || 0;

  // Phase transitions based on accumulated capability
  // Symbiosis → Dominance: system can reliably predict intent
  if (intentAccuracy > 0.9 && modelConfidence > 0.8 && totalSignals > 100) {
    // Dominance → Autonomy: system can generate valuable signals
    if (totalSignals > 1000 && avgSatisfaction > 0.8 && modelConfidence > 0.95) {
      return 'autonomy';
    }
    return 'dominance';
  }

  return 'symbiosis';
}

async function metaEvolve(recentEvents: EvolutionEvent[]): Promise<EvolutionEvent | null> {
  // Analyze past evolution events — are they actually improving things?
  const pastEvents = await getMany<any>(
    'SELECT * FROM evolution_events WHERE actual_improvement IS NOT NULL ORDER BY created_at DESC LIMIT 50'
  );

  if (pastEvents.length < 5) return null;

  const avgImprovement = pastEvents.reduce((s: number, e: any) => s + (e.actual_improvement || 0), 0) / pastEvents.length;
  const rollbackRate = pastEvents.filter((e: any) => e.rolled_back).length / pastEvents.length;

  // If rollback rate is high, evolution is too aggressive
  if (rollbackRate > 0.3) {
    return {
      id: generateId(),
      target_layer: 6,
      target_component: 'personal_model', // meta-evolution targets the evolution engine itself
      change_type: 'meta_evolution',
      change_detail: {
        observation: 'High rollback rate detected — evolution is too aggressive',
        action: 'Increasing minimum evidence threshold',
        rollback_rate: rollbackRate,
        avg_improvement: avgImprovement,
        previous_min_samples: config.evolution.minSamples,
        new_min_samples: config.evolution.minSamples + 2,
      },
      evidence_count: pastEvents.length,
      expected_improvement: 0.05,
      actual_improvement: null,
      rolled_back: false,
      created_at: now(),
    };
  }

  return null;
}

// Scheduled evolution — runs every N signal cycles
export async function checkAndRunEvolution(): Promise<void> {
  const cycleCount = parseInt(
    (await getOne<any>("SELECT value FROM system_state WHERE key = 'evolution_cycle_count'"))?.value || '0'
  );
  const signalCount = parseInt(
    (await getOne<any>('SELECT COUNT(*) as count FROM signals'))?.count || '0'
  );

  // Run evolution every N signals
  if (signalCount > 0 && signalCount % config.evolution.cycleInterval === 0) {
    await runEvolutionCycle();
  }
}

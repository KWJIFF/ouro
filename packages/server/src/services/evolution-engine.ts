import { generateId, now } from '@ouro/core';
import type { EvolutionEvent, SignalPattern, MemePhase } from '@ouro/core';
import { query, getOne, getMany } from '../db/client';
import { config } from '../config';

export async function runEvolutionCycle(): Promise<EvolutionEvent[]> {
  const events: EvolutionEvent[] = [];

  // 1. Gather recent patterns
  const patterns = await getMany<SignalPattern>(
    'SELECT * FROM signal_patterns ORDER BY last_seen_at DESC LIMIT 100'
  );

  if (patterns.length < config.evolution.minSamples) {
    return events; // Not enough data yet
  }

  // 2. Analyze friction points
  const frictionPatterns = patterns.filter(p => p.pattern_type === 'friction_point');
  if (frictionPatterns.length > 0) {
    const event: EvolutionEvent = {
      id: generateId(),
      target_layer: 3,
      target_component: 'friction_fix',
      change_type: 'rule_addition',
      change_detail: {
        friction_points: frictionPatterns.map(p => p.pattern_data),
        action: 'logged_for_review',
      },
      evidence_count: frictionPatterns.length,
      expected_improvement: 0.1,
      actual_improvement: null,
      rolled_back: false,
      created_at: now(),
    };
    events.push(event);
  }

  // 3. Update personal model with domain preferences
  const domainPatterns = patterns.filter(p => p.pattern_type === 'domain_preference');
  if (domainPatterns.length > 0) {
    const domainCounts: Record<string, number> = {};
    for (const p of domainPatterns) {
      const domain = p.pattern_data.domain;
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }

    await query(
      `UPDATE system_state SET value = jsonb_set(COALESCE(value, '{}'), '{domain_preferences}', $1::jsonb), updated_at = NOW(), version = version + 1 WHERE key = 'personal_model'`,
      [JSON.stringify(domainCounts)]
    );

    events.push({
      id: generateId(),
      target_layer: 6,
      target_component: 'personal_model',
      change_type: 'weight_update',
      change_detail: { domain_preferences: domainCounts },
      evidence_count: domainPatterns.length,
      expected_improvement: 0.05,
      actual_improvement: null,
      rolled_back: false,
      created_at: now(),
    });
  }

  // 4. Increment cycle count
  await query(
    `UPDATE system_state SET value = to_jsonb((value::text::int + 1)), updated_at = NOW() WHERE key = 'evolution_cycle_count'`
  );

  // 5. Check phase transition
  const cycleCount = await getOne<{ value: any }>('SELECT value FROM system_state WHERE key = $1', ['evolution_cycle_count']);
  const currentPhase = await detectPhase(parseInt(cycleCount?.value || '0'));
  await query(
    `UPDATE system_state SET value = $1::jsonb, updated_at = NOW() WHERE key = 'meme_phase'`,
    [JSON.stringify(currentPhase)]
  );

  // 6. Store evolution events
  for (const event of events) {
    await query(
      `INSERT INTO evolution_events (id, created_at, target_layer, target_component, change_type, change_detail, evidence_count, expected_improvement)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [event.id, event.created_at, event.target_layer, event.target_component, event.change_type, JSON.stringify(event.change_detail), event.evidence_count, event.expected_improvement]
    );
  }

  return events;
}

async function detectPhase(cycleCount: number): Promise<MemePhase> {
  // Simple heuristic for now — will be replaced by actual metrics
  if (cycleCount > 1000) return 'autonomy';
  if (cycleCount > 100) return 'dominance';
  return 'symbiosis';
}

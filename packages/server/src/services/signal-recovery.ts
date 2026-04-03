import { generateId, now } from '@ouro/core';
import type { CapturedSignal, ParsedIntent, ExecutionPlan, SignalPattern, Feedback } from '@ouro/core';
import { query, getMany } from '../db/client';

export async function recoverSignals(
  signal: CapturedSignal,
  intent: ParsedIntent,
  plan: ExecutionPlan,
): Promise<SignalPattern[]> {
  const patterns: SignalPattern[] = [];

  // Pattern: time-of-day creativity trigger
  const hour = new Date(signal.created_at).getHours();
  const timeSlot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  patterns.push({
    id: generateId(),
    pattern_type: 'creativity_trigger',
    pattern_data: { trigger: 'time_of_day', value: timeSlot, modality: signal.modality },
    strength: 0.5,
    sample_count: 1,
    last_seen_at: now(),
  });

  // Pattern: domain preference
  if (intent.parameters.domain) {
    patterns.push({
      id: generateId(),
      pattern_type: 'domain_preference',
      pattern_data: { domain: intent.parameters.domain, intent_type: intent.intent_type },
      strength: 0.5,
      sample_count: 1,
      last_seen_at: now(),
    });
  }

  // Pattern: expression habit
  patterns.push({
    id: generateId(),
    pattern_type: 'expression_habit',
    pattern_data: {
      modality: signal.modality,
      avg_length: signal.normalized_text.length,
      intent_type: intent.intent_type,
    },
    strength: 0.5,
    sample_count: 1,
    last_seen_at: now(),
  });

  // Pattern: friction point if plan failed
  if (plan.status === 'failed') {
    const failedSteps = plan.steps.filter(s => s.status === 'failed');
    for (const step of failedSteps) {
      patterns.push({
        id: generateId(),
        pattern_type: 'friction_point',
        pattern_data: { layer: 3, tool: step.tool, error: step.error, intent_type: intent.intent_type },
        strength: 0.8,
        sample_count: 1,
        last_seen_at: now(),
      });
    }
  }

  // Store patterns (upsert logic - merge with existing patterns)
  for (const pattern of patterns) {
    await query(
      `INSERT INTO signal_patterns (id, pattern_type, pattern_data, strength, sample_count, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [pattern.id, pattern.pattern_type, JSON.stringify(pattern.pattern_data), pattern.strength, pattern.sample_count, pattern.last_seen_at]
    );
  }

  return patterns;
}

export async function recordFeedback(feedback: Feedback): Promise<void> {
  await query(
    `INSERT INTO feedback (id, artifact_id, signal_id, action, modification, time_to_react_ms, view_duration_ms, scroll_depth, satisfaction_score, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [feedback.id, feedback.artifact_id, feedback.signal_id, feedback.action, JSON.stringify(feedback.modification), feedback.time_to_react_ms, feedback.view_duration_ms, feedback.scroll_depth, feedback.satisfaction_score, feedback.created_at]
  );
}

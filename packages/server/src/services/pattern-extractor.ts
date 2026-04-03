import { generateId, now } from '@ouro/core';
import type { CapturedSignal, ParsedIntent, ExecutionPlan, SignalPattern, Feedback } from '@ouro/core';
import { query, getOne, getMany } from '../db/client';
import { callAI } from '../ai/llm-client';

/**
 * The pattern extractor is Layer 5's core organ — the digestive system.
 * It processes a completed signal cycle and extracts every recoverable pattern.
 * 
 * Five pattern categories:
 * 1. Creativity triggers — when/how/where ideas emerge
 * 2. Domain preferences — what topics attract this human
 * 3. Expression habits — how they communicate ideas
 * 4. Associations — how their ideas connect to each other
 * 5. Friction points — where the system fails them
 */

export async function extractPatterns(
  signal: CapturedSignal,
  intent: ParsedIntent,
  plan: ExecutionPlan,
  feedbacks: Feedback[],
): Promise<SignalPattern[]> {
  const patterns: SignalPattern[] = [];

  // === 1. Creativity Triggers ===
  patterns.push(...extractCreativityTriggers(signal));

  // === 2. Domain Preferences ===
  patterns.push(...extractDomainPreferences(signal, intent));

  // === 3. Expression Habits ===
  patterns.push(...extractExpressionHabits(signal, intent));

  // === 4. Associations (requires AI analysis) ===
  const associations = await extractAssociations(signal);
  patterns.push(...associations);

  // === 5. Friction Points ===
  patterns.push(...extractFrictionPoints(signal, intent, plan, feedbacks));

  // Persist all patterns with upsert logic
  for (const pattern of patterns) {
    await upsertPattern(pattern);
  }

  return patterns;
}

function extractCreativityTriggers(signal: CapturedSignal): SignalPattern[] {
  const patterns: SignalPattern[] = [];
  const ts = new Date(signal.created_at);

  // Time-of-day pattern
  const hour = ts.getHours();
  const timeSlot = hour < 6 ? 'deep_night' : hour < 9 ? 'early_morning' : hour < 12 ? 'morning'
    : hour < 14 ? 'midday' : hour < 17 ? 'afternoon' : hour < 20 ? 'evening' : 'night';
  patterns.push(makePattern('creativity_trigger', { trigger: 'time_of_day', value: timeSlot, hour }));

  // Day-of-week pattern
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  patterns.push(makePattern('creativity_trigger', { trigger: 'day_of_week', value: days[ts.getDay()] }));

  // Modality preference per time
  patterns.push(makePattern('creativity_trigger', {
    trigger: 'modality_time_correlation',
    modality: signal.modality,
    time_slot: timeSlot,
  }));

  // Device/context
  if (signal.context.device) {
    patterns.push(makePattern('creativity_trigger', {
      trigger: 'device',
      value: signal.context.device,
    }));
  }

  // Signal chain — was this preceded by another signal?
  if (signal.context.preceding_signal_id) {
    patterns.push(makePattern('creativity_trigger', {
      trigger: 'chain_continuation',
      chain_length: 1, // Will be accumulated
    }));
  }

  return patterns;
}

function extractDomainPreferences(signal: CapturedSignal, intent: ParsedIntent): SignalPattern[] {
  const patterns: SignalPattern[] = [];

  if (intent.parameters.domain) {
    patterns.push(makePattern('domain_preference', {
      domain: intent.parameters.domain,
      intent_type: intent.intent_type,
      confidence: intent.confidence,
    }));
  }

  if (intent.parameters.target_type) {
    patterns.push(makePattern('domain_preference', {
      target_type: intent.parameters.target_type,
      domain: intent.parameters.domain || 'general',
    }));
  }

  return patterns;
}

function extractExpressionHabits(signal: CapturedSignal, intent: ParsedIntent): SignalPattern[] {
  const text = signal.normalized_text;
  return [
    makePattern('expression_habit', {
      modality: signal.modality,
      text_length: text.length,
      word_count: text.split(/\s+/).length,
      has_questions: text.includes('?'),
      has_commands: /^(make|create|build|write|generate|do|find|show|give)/i.test(text),
      abstraction_level: text.length < 50 ? 'high' : text.length < 200 ? 'medium' : 'low',
      language_detected: detectLanguage(text),
      intent_type: intent.intent_type,
    }),
  ];
}

async function extractAssociations(signal: CapturedSignal): Promise<SignalPattern[]> {
  if (!signal.embedding) return [];

  // Find similar past signals via vector search
  const embStr = `[${signal.embedding.join(',')}]`;
  const similar = await getMany<any>(
    `SELECT id, normalized_text, 1 - (embedding <=> $1::vector) as similarity
     FROM signals WHERE embedding IS NOT NULL AND id != $2
     ORDER BY embedding <=> $1::vector LIMIT 5`,
    [embStr, signal.id]
  );

  const patterns: SignalPattern[] = [];
  for (const sim of similar) {
    if (sim.similarity > 0.7) {
      patterns.push(makePattern('association', {
        source_signal_id: signal.id,
        target_signal_id: sim.id,
        similarity: sim.similarity,
        source_preview: signal.normalized_text.slice(0, 100),
        target_preview: sim.normalized_text.slice(0, 100),
      }));

      // Also create an idea_connection
      try {
        await query(
          `INSERT INTO idea_connections (id, source_signal_id, target_signal_id, connection_type, strength, created_by)
           VALUES ($1, $2, $3, 'semantic_similarity', $4, 'system')
           ON CONFLICT (source_signal_id, target_signal_id, connection_type) DO UPDATE SET strength = $4`,
          [generateId(), signal.id, sim.id, sim.similarity]
        );
      } catch { /* ignore duplicate */ }
    }
  }

  return patterns;
}

function extractFrictionPoints(
  signal: CapturedSignal,
  intent: ParsedIntent,
  plan: ExecutionPlan,
  feedbacks: Feedback[],
): SignalPattern[] {
  const patterns: SignalPattern[] = [];

  // Intent misclassification (if user modified/rejected)
  const hasRejection = feedbacks.some(f => f.action === 'reject');
  const hasModification = feedbacks.some(f => f.action === 'modify');
  if (hasRejection) {
    patterns.push(makePattern('friction_point', {
      layer: 2, type: 'intent_misclassification',
      intent_type: intent.intent_type, confidence: intent.confidence,
      signal_modality: signal.modality,
    }));
  }

  // Execution failures
  for (const step of plan.steps) {
    if (step.status === 'failed') {
      patterns.push(makePattern('friction_point', {
        layer: 3, type: 'execution_failure',
        tool: step.tool, error: step.error?.slice(0, 200),
        intent_type: intent.intent_type,
      }));
    }
  }

  // Low satisfaction
  const avgSat = feedbacks.reduce((sum, f) => sum + (f.satisfaction_score || 0.5), 0) / (feedbacks.length || 1);
  if (avgSat < 0.4) {
    patterns.push(makePattern('friction_point', {
      layer: 4, type: 'low_satisfaction',
      avg_satisfaction: avgSat, feedback_count: feedbacks.length,
      intent_type: intent.intent_type,
    }));
  }

  // Clarification was needed
  if (intent.needs_clarification) {
    patterns.push(makePattern('friction_point', {
      layer: 2, type: 'required_clarification',
      confidence: intent.confidence, signal_modality: signal.modality,
    }));
  }

  return patterns;
}

function makePattern(type: SignalPattern['pattern_type'], data: Record<string, any>): SignalPattern {
  return {
    id: generateId(),
    pattern_type: type,
    pattern_data: data,
    strength: 0.5,
    sample_count: 1,
    last_seen_at: now(),
  };
}

async function upsertPattern(pattern: SignalPattern): Promise<void> {
  // Try to find an existing pattern of the same type with similar data
  // For simplicity, insert new — the evolution engine will aggregate
  await query(
    `INSERT INTO signal_patterns (id, pattern_type, pattern_data, strength, sample_count, last_seen_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [pattern.id, pattern.pattern_type, JSON.stringify(pattern.pattern_data),
     pattern.strength, pattern.sample_count, pattern.last_seen_at]
  );
}

function detectLanguage(text: string): string {
  // Simple heuristic — CJK character detection
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/[\u0400-\u04ff]/.test(text)) return 'ru';
  if (/[\u0600-\u06ff]/.test(text)) return 'ar';
  return 'en';
}

import { getMany, getOne, query } from '../db/client';
import { now } from '@ouro/core';

/**
 * The Personal Model is the meme's internal representation of its host.
 * It accumulates across all signal cycles and encodes:
 * - Domain preferences and their relative strengths
 * - Expression patterns (how they communicate)
 * - Temporal rhythms (when they create)
 * - Quality preferences (what satisfies them)
 * - Creative topology (how their ideas connect)
 */

export interface PersonalModel {
  domain_preferences: Record<string, number>;     // domain → strength
  intent_distribution: Record<string, number>;     // intent_type → frequency
  modality_preferences: Record<string, number>;    // modality → frequency
  temporal_profile: {
    peak_hours: number[];                          // Hours with most signals
    peak_days: string[];                           // Days with most signals
    avg_signals_per_day: number;
  };
  expression_profile: {
    avg_signal_length: number;
    preferred_abstraction: 'high' | 'medium' | 'low';
    languages: Record<string, number>;
    uses_questions: number;                        // % of signals containing questions
    uses_commands: number;                         // % of signals with imperative verbs
  };
  quality_preferences: {
    avg_satisfaction: number;
    accepts_ratio: number;
    modifies_ratio: number;
    rejects_ratio: number;
    top_friction_points: Array<{ type: string; frequency: number }>;
  };
  evolution_readiness: {
    total_signals: number;
    total_cycles: number;
    model_confidence: number;                      // 0-1, how well do we know this host
    data_density: number;                          // patterns per signal
  };
}

export async function buildPersonalModel(): Promise<PersonalModel> {
  // Aggregate patterns from all signal history
  const patterns = await getMany('SELECT * FROM signal_patterns ORDER BY last_seen_at DESC');
  const signals = await getMany('SELECT modality, created_at, normalized_text FROM signals ORDER BY created_at DESC LIMIT 1000');
  const feedbackStats = await getOne<any>(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE action = 'accept') as accepts,
            COUNT(*) FILTER (WHERE action = 'modify') as modifies,
            COUNT(*) FILTER (WHERE action = 'reject') as rejects,
            AVG(satisfaction_score) as avg_satisfaction
     FROM feedback`
  );

  // Domain preferences
  const domainPatterns = patterns.filter((p: any) => p.pattern_type === 'domain_preference');
  const domainPrefs: Record<string, number> = {};
  for (const p of domainPatterns) {
    const domain = p.pattern_data?.domain;
    if (domain) domainPrefs[domain] = (domainPrefs[domain] || 0) + 1;
  }

  // Intent distribution
  const intentDist: Record<string, number> = {};
  const intentPatterns = patterns.filter((p: any) => p.pattern_data?.intent_type);
  for (const p of intentPatterns) {
    const it = p.pattern_data.intent_type;
    intentDist[it] = (intentDist[it] || 0) + 1;
  }

  // Modality preferences
  const modalityPrefs: Record<string, number> = {};
  for (const s of signals) {
    modalityPrefs[s.modality] = (modalityPrefs[s.modality] || 0) + 1;
  }

  // Temporal profile
  const hourCounts = new Array(24).fill(0);
  const dayCounts: Record<string, number> = {};
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (const s of signals) {
    const d = new Date(s.created_at);
    hourCounts[d.getHours()]++;
    const day = days[d.getDay()];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  const peakHours = hourCounts
    .map((count: number, hour: number) => ({ hour, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 3)
    .map((h: any) => h.hour);
  const peakDays = Object.entries(dayCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([day]) => day);

  // Expression profile
  const expressionPatterns = patterns.filter((p: any) => p.pattern_type === 'expression_habit');
  const avgLength = expressionPatterns.reduce((s: number, p: any) => s + (p.pattern_data?.text_length || 0), 0) / (expressionPatterns.length || 1);
  const languages: Record<string, number> = {};
  for (const p of expressionPatterns) {
    const lang = p.pattern_data?.language_detected;
    if (lang) languages[lang] = (languages[lang] || 0) + 1;
  }

  // Friction points
  const frictionPatterns = patterns.filter((p: any) => p.pattern_type === 'friction_point');
  const frictionCounts: Record<string, number> = {};
  for (const p of frictionPatterns) {
    const type = p.pattern_data?.type || 'unknown';
    frictionCounts[type] = (frictionCounts[type] || 0) + 1;
  }
  const topFriction = Object.entries(frictionCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([type, freq]) => ({ type, frequency: freq as number }));

  const totalFeedback = parseInt(feedbackStats?.total || '0');
  const model: PersonalModel = {
    domain_preferences: domainPrefs,
    intent_distribution: intentDist,
    modality_preferences: modalityPrefs,
    temporal_profile: {
      peak_hours: peakHours,
      peak_days: peakDays,
      avg_signals_per_day: signals.length > 0 ? signals.length / Math.max(1, daysBetween(signals[signals.length - 1].created_at, signals[0].created_at)) : 0,
    },
    expression_profile: {
      avg_signal_length: Math.round(avgLength),
      preferred_abstraction: avgLength < 50 ? 'high' : avgLength < 200 ? 'medium' : 'low',
      languages,
      uses_questions: expressionPatterns.filter((p: any) => p.pattern_data?.has_questions).length / (expressionPatterns.length || 1),
      uses_commands: expressionPatterns.filter((p: any) => p.pattern_data?.has_commands).length / (expressionPatterns.length || 1),
    },
    quality_preferences: {
      avg_satisfaction: parseFloat(feedbackStats?.avg_satisfaction || '0.5'),
      accepts_ratio: totalFeedback > 0 ? parseInt(feedbackStats?.accepts || '0') / totalFeedback : 0,
      modifies_ratio: totalFeedback > 0 ? parseInt(feedbackStats?.modifies || '0') / totalFeedback : 0,
      rejects_ratio: totalFeedback > 0 ? parseInt(feedbackStats?.rejects || '0') / totalFeedback : 0,
      top_friction_points: topFriction,
    },
    evolution_readiness: {
      total_signals: signals.length,
      total_cycles: parseInt((await getOne<any>("SELECT value FROM system_state WHERE key = 'evolution_cycle_count'"))?.value || '0'),
      model_confidence: Math.min(1, signals.length / 100), // Confidence grows with data
      data_density: patterns.length / (signals.length || 1),
    },
  };

  // Persist to system_state
  await query(
    `UPDATE system_state SET value = $1::jsonb, updated_at = NOW(), version = version + 1 WHERE key = 'personal_model'`,
    [JSON.stringify(model)]
  );

  return model;
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export async function getPersonalModel(): Promise<PersonalModel | null> {
  const row = await getOne<any>("SELECT value FROM system_state WHERE key = 'personal_model'");
  return row?.value || null;
}

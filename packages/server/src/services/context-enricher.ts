import { getMany, getOne } from '../db/client';
import type { CapturedSignal } from '@ouro/core';

/**
 * Context Enricher — Adds contextual information to signals before parsing.
 * 
 * Enrichment sources:
 * 1. Session context (previous signals in this session)
 * 2. Personal model (user preferences and patterns)
 * 3. Temporal context (time of day, day of week, recent activity)
 * 4. Tool context (recently used tools, cached paths)
 * 5. Evolution context (current phase, recent improvements)
 * 
 * This enriched context helps the intent parser make better decisions.
 */

export interface EnrichedContext {
  session: {
    signalCount: number;
    recentSignals: Array<{ text: string; intent: string; timestamp: string }>;
    activeTopics: string[];
    sessionDuration: number;
  };
  personal: {
    topDomains: string[];
    preferredModality: string;
    abstractionLevel: string;
    recentDomains: string[];
  };
  temporal: {
    timeOfDay: string;
    dayOfWeek: string;
    hoursSinceLastSignal: number;
    signalsToday: number;
    isActiveHour: boolean;
  };
  tools: {
    recentlyUsed: string[];
    mostSuccessful: string[];
    cachedPathsAvailable: boolean;
  };
  evolution: {
    phase: string;
    modelConfidence: number;
    cyclesSinceLastEvolution: number;
  };
}

export async function enrichSignalContext(signal: CapturedSignal): Promise<EnrichedContext> {
  const [session, personal, temporal, tools, evolution] = await Promise.all([
    getSessionContext(signal),
    getPersonalContext(),
    getTemporalContext(signal),
    getToolContext(),
    getEvolutionContext(),
  ]);

  return { session, personal, temporal, tools, evolution };
}

async function getSessionContext(signal: CapturedSignal) {
  const sessionId = signal.context?.session_id;
  let recentSignals: any[] = [];
  let activeTopics: string[] = [];
  let sessionDuration = 0;

  if (sessionId) {
    recentSignals = await getMany(
      `SELECT s.normalized_text as text, i.intent_type as intent, s.created_at as timestamp
       FROM signals s LEFT JOIN intents i ON i.signal_id = s.id
       WHERE s.context->>'session_id' = $1 AND s.id != $2
       ORDER BY s.created_at DESC LIMIT 5`,
      [sessionId, signal.id]
    );

    // Extract active topics from recent intents
    const domains = await getMany(
      `SELECT DISTINCT i.parameters->>'domain' as domain
       FROM signals s JOIN intents i ON i.signal_id = s.id
       WHERE s.context->>'session_id' = $1 AND i.parameters->>'domain' IS NOT NULL`,
      [sessionId]
    );
    activeTopics = domains.map((d: any) => d.domain).filter(Boolean);

    // Session duration
    const firstSignal = await getOne(
      `SELECT created_at FROM signals WHERE context->>'session_id' = $1 ORDER BY created_at LIMIT 1`,
      [sessionId]
    );
    if (firstSignal) {
      sessionDuration = Date.now() - new Date((firstSignal as any).created_at).getTime();
    }
  }

  return {
    signalCount: recentSignals.length,
    recentSignals: recentSignals.map((s: any) => ({
      text: s.text?.slice(0, 100),
      intent: s.intent || 'unknown',
      timestamp: s.timestamp,
    })),
    activeTopics,
    sessionDuration,
  };
}

async function getPersonalContext() {
  const model = await getOne<any>("SELECT value FROM system_state WHERE key = 'personal_model'");
  const pm = model?.value || {};

  const topDomains = Object.entries(pm.domain_preferences || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5)
    .map(([d]) => d);

  const topModality = Object.entries(pm.modality_preferences || {})
    .sort(([, a]: any, [, b]: any) => b - a)?.[0]?.[0] || 'text';

  // Recent domains (last 10 signals)
  const recent = await getMany(
    `SELECT i.parameters->>'domain' as domain FROM intents i
     JOIN signals s ON s.id = i.signal_id
     ORDER BY s.created_at DESC LIMIT 10`
  );
  const recentDomains = [...new Set(recent.map((r: any) => r.domain).filter(Boolean))];

  return {
    topDomains,
    preferredModality: topModality,
    abstractionLevel: pm.expression_profile?.preferred_abstraction || 'medium',
    recentDomains,
  };
}

async function getTemporalContext(signal: CapturedSignal) {
  const now = new Date(signal.created_at);
  const hour = now.getHours();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const timeOfDay = hour < 6 ? 'deep_night' : hour < 9 ? 'early_morning' : hour < 12 ? 'morning'
    : hour < 14 ? 'midday' : hour < 17 ? 'afternoon' : hour < 20 ? 'evening' : 'night';

  // Signals today
  const todayCount = await getOne<any>(
    `SELECT COUNT(*) as c FROM signals WHERE created_at > CURRENT_DATE`
  );

  // Last signal time
  const lastSignal = await getOne<any>(
    `SELECT created_at FROM signals WHERE id != $1 ORDER BY created_at DESC LIMIT 1`,
    [signal.id]
  );
  const hoursSinceLast = lastSignal
    ? (Date.now() - new Date(lastSignal.created_at).getTime()) / (1000 * 60 * 60)
    : 999;

  // Check if this is an active hour (from personal model peak hours)
  const model = await getOne<any>("SELECT value FROM system_state WHERE key = 'personal_model'");
  const peakHours = model?.value?.temporal_profile?.peak_hours || [];
  const isActiveHour = peakHours.includes(hour);

  return {
    timeOfDay,
    dayOfWeek: days[now.getDay()],
    hoursSinceLastSignal: Math.round(hoursSinceLast * 10) / 10,
    signalsToday: parseInt(todayCount?.c || '0'),
    isActiveHour,
  };
}

async function getToolContext() {
  const recentTools = await getMany(
    `SELECT DISTINCT es.tool_name FROM execution_steps es
     JOIN execution_plans ep ON ep.id = es.plan_id
     ORDER BY ep.created_at DESC LIMIT 10`
  );

  const successfulTools = await getMany(
    `SELECT es.tool_name, COUNT(*) as c FROM execution_steps es
     WHERE es.status = 'completed'
     GROUP BY es.tool_name ORDER BY c DESC LIMIT 5`
  );

  const cachedPaths = await getOne<any>(
    "SELECT value FROM system_state WHERE key = 'execution_path_cache'"
  );

  return {
    recentlyUsed: recentTools.map((t: any) => t.tool_name),
    mostSuccessful: successfulTools.map((t: any) => t.tool_name),
    cachedPathsAvailable: !!cachedPaths?.value && Object.keys(cachedPaths.value).length > 0,
  };
}

async function getEvolutionContext() {
  const phase = await getOne<any>("SELECT value FROM system_state WHERE key = 'meme_phase'");
  const model = await getOne<any>("SELECT value FROM system_state WHERE key = 'personal_model'");
  const cycleCount = await getOne<any>("SELECT value FROM system_state WHERE key = 'evolution_cycle_count'");

  return {
    phase: phase?.value || 'symbiosis',
    modelConfidence: model?.value?.evolution_readiness?.model_confidence || 0,
    cyclesSinceLastEvolution: 0, // Would track this in production
  };
}

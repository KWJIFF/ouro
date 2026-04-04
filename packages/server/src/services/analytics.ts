import { getMany, getOne } from '../db/client';

/**
 * Analytics Service — Layer 5/6 data aggregation.
 * Provides comprehensive metrics about the meme's health, growth, and evolution.
 */

export interface SystemAnalytics {
  overview: {
    total_signals: number;
    total_artifacts: number;
    total_patterns: number;
    total_connections: number;
    total_feedback: number;
    total_evolutions: number;
    meme_phase: string;
    system_uptime_signals: number; // How many signals since first
  };
  signal_analytics: {
    signals_today: number;
    signals_this_week: number;
    signals_this_month: number;
    by_modality: Record<string, number>;
    by_status: Record<string, number>;
    by_hour: number[];
    by_day_of_week: Record<string, number>;
    avg_per_day: number;
    trend: 'growing' | 'stable' | 'declining';
  };
  intent_analytics: {
    by_type: Record<string, number>;
    avg_confidence: number;
    clarification_rate: number;
    top_domains: Array<{ domain: string; count: number }>;
    top_target_types: Array<{ type: string; count: number }>;
  };
  execution_analytics: {
    total_plans: number;
    success_rate: number;
    avg_steps_per_plan: number;
    avg_duration_ms: number;
    by_tool: Array<{ tool: string; uses: number; success_rate: number }>;
    total_tokens_used: number;
  };
  artifact_analytics: {
    by_type: Record<string, number>;
    total_versions: number;
    avg_versions_per_signal: number;
  };
  feedback_analytics: {
    by_action: Record<string, number>;
    avg_satisfaction: number;
    avg_time_to_react_ms: number;
    accept_rate: number;
    modify_rate: number;
    reject_rate: number;
  };
  evolution_analytics: {
    total_cycles: number;
    total_events: number;
    by_layer: Record<number, number>;
    by_component: Record<string, number>;
    by_change_type: Record<string, number>;
    improvement_trend: number[];
  };
  pattern_analytics: {
    by_type: Record<string, number>;
    top_creativity_triggers: Array<{ trigger: string; count: number }>;
    top_friction_points: Array<{ type: string; count: number }>;
    association_density: number;
  };
}

export async function getFullAnalytics(): Promise<SystemAnalytics> {
  const [overview, signals, intents, plans, artifacts, feedback, evolution, patterns] = await Promise.all([
    getOverviewStats(),
    getSignalAnalytics(),
    getIntentAnalytics(),
    getExecutionAnalytics(),
    getArtifactAnalytics(),
    getFeedbackAnalytics(),
    getEvolutionAnalytics(),
    getPatternAnalytics(),
  ]);

  return {
    overview,
    signal_analytics: signals,
    intent_analytics: intents,
    execution_analytics: plans,
    artifact_analytics: artifacts,
    feedback_analytics: feedback,
    evolution_analytics: evolution,
    pattern_analytics: patterns,
  };
}

async function getOverviewStats() {
  const r = await getOne<any>(`
    SELECT
      (SELECT COUNT(*) FROM signals) as signals,
      (SELECT COUNT(*) FROM artifacts) as artifacts,
      (SELECT COUNT(*) FROM signal_patterns) as patterns,
      (SELECT COUNT(*) FROM idea_connections) as connections,
      (SELECT COUNT(*) FROM feedback) as feedback,
      (SELECT COUNT(*) FROM evolution_events) as evolutions
  `);
  const phase = await getOne<any>("SELECT value FROM system_state WHERE key = 'meme_phase'");

  return {
    total_signals: parseInt(r?.signals || '0'),
    total_artifacts: parseInt(r?.artifacts || '0'),
    total_patterns: parseInt(r?.patterns || '0'),
    total_connections: parseInt(r?.connections || '0'),
    total_feedback: parseInt(r?.feedback || '0'),
    total_evolutions: parseInt(r?.evolutions || '0'),
    meme_phase: phase?.value || 'symbiosis',
    system_uptime_signals: parseInt(r?.signals || '0'),
  };
}

async function getSignalAnalytics() {
  const today = await getOne<any>("SELECT COUNT(*) as c FROM signals WHERE created_at > NOW() - INTERVAL '1 day'");
  const week = await getOne<any>("SELECT COUNT(*) as c FROM signals WHERE created_at > NOW() - INTERVAL '7 days'");
  const month = await getOne<any>("SELECT COUNT(*) as c FROM signals WHERE created_at > NOW() - INTERVAL '30 days'");

  const byModality = await getMany<any>('SELECT modality, COUNT(*) as c FROM signals GROUP BY modality ORDER BY c DESC');
  const byStatus = await getMany<any>('SELECT status, COUNT(*) as c FROM signals GROUP BY status ORDER BY c DESC');

  const byHour = await getMany<any>(
    "SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as c FROM signals GROUP BY hour ORDER BY hour"
  );
  const hourArray = new Array(24).fill(0);
  for (const r of byHour) hourArray[parseInt(r.hour)] = parseInt(r.c);

  const byDay = await getMany<any>(
    "SELECT to_char(created_at, 'Day') as day, COUNT(*) as c FROM signals GROUP BY day ORDER BY c DESC"
  );

  const total = parseInt(today?.c || '0') + parseInt(week?.c || '0');
  const firstSignal = await getOne<any>('SELECT created_at FROM signals ORDER BY created_at LIMIT 1');
  const daysSinceFirst = firstSignal ? Math.max(1, (Date.now() - new Date(firstSignal.created_at).getTime()) / 86400000) : 1;

  // Trend: compare this week vs last week
  const lastWeek = await getOne<any>(
    "SELECT COUNT(*) as c FROM signals WHERE created_at > NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'"
  );
  const thisWeekCount = parseInt(week?.c || '0');
  const lastWeekCount = parseInt(lastWeek?.c || '0');
  let trend: 'growing' | 'stable' | 'declining' = 'stable';
  if (thisWeekCount > lastWeekCount * 1.2) trend = 'growing';
  else if (thisWeekCount < lastWeekCount * 0.8) trend = 'declining';

  return {
    signals_today: parseInt(today?.c || '0'),
    signals_this_week: thisWeekCount,
    signals_this_month: parseInt(month?.c || '0'),
    by_modality: Object.fromEntries(byModality.map((r: any) => [r.modality, parseInt(r.c)])),
    by_status: Object.fromEntries(byStatus.map((r: any) => [r.status, parseInt(r.c)])),
    by_hour: hourArray,
    by_day_of_week: Object.fromEntries(byDay.map((r: any) => [r.day?.trim(), parseInt(r.c)])),
    avg_per_day: total / daysSinceFirst,
    trend,
  };
}

async function getIntentAnalytics() {
  const byType = await getMany<any>('SELECT intent_type, COUNT(*) as c FROM intents GROUP BY intent_type ORDER BY c DESC');
  const avgConf = await getOne<any>('SELECT AVG(confidence) as avg FROM intents');
  const clarRate = await getOne<any>("SELECT COUNT(*) FILTER (WHERE clarification_asked = TRUE)::FLOAT / GREATEST(COUNT(*), 1) as rate FROM intents");

  const topDomains = await getMany<any>(
    "SELECT parameters->>'domain' as domain, COUNT(*) as c FROM intents WHERE parameters->>'domain' IS NOT NULL GROUP BY domain ORDER BY c DESC LIMIT 10"
  );
  const topTargets = await getMany<any>(
    "SELECT parameters->>'target_type' as type, COUNT(*) as c FROM intents WHERE parameters->>'target_type' IS NOT NULL GROUP BY type ORDER BY c DESC LIMIT 10"
  );

  return {
    by_type: Object.fromEntries(byType.map((r: any) => [r.intent_type, parseInt(r.c)])),
    avg_confidence: parseFloat(avgConf?.avg || '0'),
    clarification_rate: parseFloat(clarRate?.rate || '0'),
    top_domains: topDomains.map((r: any) => ({ domain: r.domain, count: parseInt(r.c) })),
    top_target_types: topTargets.map((r: any) => ({ type: r.type, count: parseInt(r.c) })),
  };
}

async function getExecutionAnalytics() {
  const stats = await getOne<any>(`
    SELECT COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'completed') as completed,
           AVG(total_steps) as avg_steps,
           AVG(total_duration_ms) as avg_duration,
           SUM(total_tokens_used) as total_tokens
    FROM execution_plans
  `);

  const byTool = await getMany<any>(`
    SELECT tool_name, COUNT(*) as uses,
           COUNT(*) FILTER (WHERE status = 'completed')::FLOAT / GREATEST(COUNT(*), 1) as success_rate
    FROM execution_steps GROUP BY tool_name ORDER BY uses DESC
  `);

  const total = parseInt(stats?.total || '0');
  return {
    total_plans: total,
    success_rate: total > 0 ? parseInt(stats?.completed || '0') / total : 0,
    avg_steps_per_plan: parseFloat(stats?.avg_steps || '0'),
    avg_duration_ms: parseFloat(stats?.avg_duration || '0'),
    by_tool: byTool.map((r: any) => ({ tool: r.tool_name, uses: parseInt(r.uses), success_rate: parseFloat(r.success_rate) })),
    total_tokens_used: parseInt(stats?.total_tokens || '0'),
  };
}

async function getArtifactAnalytics() {
  const byType = await getMany<any>('SELECT artifact_type, COUNT(*) as c FROM artifacts GROUP BY artifact_type ORDER BY c DESC');
  const versions = await getOne<any>('SELECT COUNT(*) as total, COUNT(DISTINCT signal_id) as unique_signals FROM artifacts');

  return {
    by_type: Object.fromEntries(byType.map((r: any) => [r.artifact_type, parseInt(r.c)])),
    total_versions: parseInt(versions?.total || '0'),
    avg_versions_per_signal: parseInt(versions?.unique_signals || '1') > 0 ? parseInt(versions?.total || '0') / parseInt(versions?.unique_signals || '1') : 0,
  };
}

async function getFeedbackAnalytics() {
  const stats = await getOne<any>(`
    SELECT COUNT(*) as total,
           AVG(satisfaction_score) as avg_sat,
           AVG(time_to_react_ms) as avg_react,
           COUNT(*) FILTER (WHERE action = 'accept')::FLOAT / GREATEST(COUNT(*), 1) as accept_rate,
           COUNT(*) FILTER (WHERE action = 'modify')::FLOAT / GREATEST(COUNT(*), 1) as modify_rate,
           COUNT(*) FILTER (WHERE action = 'reject')::FLOAT / GREATEST(COUNT(*), 1) as reject_rate
    FROM feedback
  `);

  const byAction = await getMany<any>('SELECT action, COUNT(*) as c FROM feedback GROUP BY action ORDER BY c DESC');

  return {
    by_action: Object.fromEntries(byAction.map((r: any) => [r.action, parseInt(r.c)])),
    avg_satisfaction: parseFloat(stats?.avg_sat || '0.5'),
    avg_time_to_react_ms: parseFloat(stats?.avg_react || '0'),
    accept_rate: parseFloat(stats?.accept_rate || '0'),
    modify_rate: parseFloat(stats?.modify_rate || '0'),
    reject_rate: parseFloat(stats?.reject_rate || '0'),
  };
}

async function getEvolutionAnalytics() {
  const cycles = await getOne<any>("SELECT value FROM system_state WHERE key = 'evolution_cycle_count'");
  const total = await getOne<any>('SELECT COUNT(*) as c FROM evolution_events');

  const byLayer = await getMany<any>('SELECT target_layer, COUNT(*) as c FROM evolution_events GROUP BY target_layer ORDER BY target_layer');
  const byComponent = await getMany<any>('SELECT target_component, COUNT(*) as c FROM evolution_events GROUP BY target_component ORDER BY c DESC');
  const byChange = await getMany<any>('SELECT change_type, COUNT(*) as c FROM evolution_events GROUP BY change_type ORDER BY c DESC');

  const improvements = await getMany<any>(
    'SELECT expected_improvement FROM evolution_events WHERE expected_improvement IS NOT NULL ORDER BY created_at DESC LIMIT 20'
  );

  return {
    total_cycles: parseInt(cycles?.value || '0'),
    total_events: parseInt(total?.c || '0'),
    by_layer: Object.fromEntries(byLayer.map((r: any) => [parseInt(r.target_layer), parseInt(r.c)])),
    by_component: Object.fromEntries(byComponent.map((r: any) => [r.target_component, parseInt(r.c)])),
    by_change_type: Object.fromEntries(byChange.map((r: any) => [r.change_type, parseInt(r.c)])),
    improvement_trend: improvements.map((r: any) => parseFloat(r.expected_improvement)),
  };
}

async function getPatternAnalytics() {
  const byType = await getMany<any>('SELECT pattern_type, COUNT(*) as c FROM signal_patterns GROUP BY pattern_type ORDER BY c DESC');

  const triggers = await getMany<any>(
    "SELECT pattern_data->>'trigger' as trigger, COUNT(*) as c FROM signal_patterns WHERE pattern_type = 'creativity_trigger' AND pattern_data->>'trigger' IS NOT NULL GROUP BY trigger ORDER BY c DESC LIMIT 10"
  );

  const friction = await getMany<any>(
    "SELECT pattern_data->>'type' as type, COUNT(*) as c FROM signal_patterns WHERE pattern_type = 'friction_point' AND pattern_data->>'type' IS NOT NULL GROUP BY type ORDER BY c DESC LIMIT 10"
  );

  const associations = await getOne<any>(
    "SELECT COUNT(*) as c FROM signal_patterns WHERE pattern_type = 'association'"
  );
  const signals = await getOne<any>('SELECT COUNT(*) as c FROM signals');

  return {
    by_type: Object.fromEntries(byType.map((r: any) => [r.pattern_type, parseInt(r.c)])),
    top_creativity_triggers: triggers.map((r: any) => ({ trigger: r.trigger, count: parseInt(r.c) })),
    top_friction_points: friction.map((r: any) => ({ type: r.type, count: parseInt(r.c) })),
    association_density: parseInt(signals?.c || '1') > 0 ? parseInt(associations?.c || '0') / parseInt(signals?.c || '1') : 0,
  };
}

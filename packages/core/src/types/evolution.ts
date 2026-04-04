/**
 * Evolution Types — Layer 6
 * 
 * The reproductive system: the meme rewrites its own DNA.
 */

export type MemePhase = 'symbiosis' | 'dominance' | 'autonomy';

export type EvolutionChangeType = 'prompt_revision' | 'weight_update' | 'path_cache' | 'config_change' | 'tool_addition' | 'meta_evolution';

export interface EvolutionEvent {
  id: string;
  target_layer: number;
  target_component: string;
  change_type: EvolutionChangeType;
  change_detail: Record<string, any>;
  evidence_count: number;
  expected_improvement: number | null;
  actual_improvement: number | null;
  rolled_back: boolean;
  created_at: string;
}

export interface EvolutionCycleReport {
  cycle_number: number;
  phase: MemePhase;
  patterns_analyzed: number;
  events_generated: number;
  improvements_deployed: number;
  rollbacks: number;
  model_confidence_before: number;
  model_confidence_after: number;
  duration_ms: number;
}

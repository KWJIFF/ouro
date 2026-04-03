export type MemePhase = 'symbiosis' | 'dominance' | 'autonomy';
export type EvolutionTarget = 'intent_model' | 'tool_selection' | 'prompt_template' | 'execution_path' | 'friction_fix' | 'personal_model';
export type EvolutionChangeType = 'weight_update' | 'prompt_revision' | 'rule_addition' | 'path_cache' | 'tool_addition' | 'meta_evolution';

export interface EvolutionEvent {
  id: string;
  target_layer: number;
  target_component: EvolutionTarget;
  change_type: EvolutionChangeType;
  change_detail: Record<string, any>;
  evidence_count: number;
  expected_improvement: number | null;
  actual_improvement: number | null;
  rolled_back: boolean;
  created_at: string;
}

export interface SystemState {
  meme_phase: MemePhase;
  evolution_cycle_count: number;
  intent_model_version: string;
  tool_preference_weights: Record<string, number>;
  prompt_templates_version: string;
  personal_model: Record<string, any>;
  friction_map: Record<string, any>;
}

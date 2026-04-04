/**
 * Recovery Types — Layer 5
 * 
 * The digestive system: extracting nutrients from every interaction.
 */

export type PatternType = 'creativity_trigger' | 'domain_preference' | 'expression_habit' | 'association' | 'friction_point';

export interface SignalPattern {
  id: string;
  pattern_type: PatternType;
  pattern_data: Record<string, any>;
  strength: number;             // 0-1, increases with evidence
  sample_count: number;
  last_seen_at: string;
}

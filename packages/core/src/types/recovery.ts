export type PatternType = 'creativity_trigger' | 'domain_preference' | 'expression_habit' | 'association' | 'friction_point';
export type FeedbackAction = 'accept' | 'modify' | 'reject' | 'fork' | 'share' | 'revisit';

export interface SignalPattern {
  id: string;
  pattern_type: PatternType;
  pattern_data: Record<string, any>;
  strength: number;
  sample_count: number;
  last_seen_at: string;
}

export interface Feedback {
  id: string;
  artifact_id: string;
  signal_id: string;
  action: FeedbackAction;
  modification?: Record<string, any>;
  time_to_react_ms?: number;
  view_duration_ms?: number;
  scroll_depth?: number;
  satisfaction_score?: number;
  created_at: string;
}

export interface ExecutionStep {
  id: string;
  tool: string;
  input: Record<string, any>;
  depends_on: string[];
  fallback?: { tool: string; input: Record<string, any> };
  estimated_duration_ms: number;
  estimated_tokens: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface ExecutionPlan {
  id: string;
  intent_id: string;
  signal_id: string;
  steps: ExecutionStep[];
  parallel_groups: string[][];
  estimated_total_duration_ms: number;
  estimated_total_tokens: number;
  status: 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

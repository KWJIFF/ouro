/**
 * Execution Types — Layer 3
 * 
 * The motor system: turning intent into action through tool orchestration.
 */

export type PlanStatus = 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ExecutionStep {
  id: string;
  tool: string;                   // Tool ID from registry
  input: Record<string, any>;     // Parameters for the tool
  depends_on: string[];           // Step IDs this depends on
  estimated_duration_ms: number;
  estimated_tokens: number;
  status: StepStatus;
  started_at?: string;
  completed_at?: string;
  output?: ToolOutput;
  error?: string;
  fallback?: {                    // Fallback tool if primary fails
    tool: string;
    input: Record<string, any>;
  };
  retry_count?: number;
  max_retries?: number;
}

export interface ExecutionPlan {
  id: string;
  signal_id: string;
  intent_id: string;
  steps: ExecutionStep[];
  parallel_groups: string[][];    // Groups of step IDs that can run concurrently
  status: PlanStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_total_duration_ms: number;
  estimated_total_tokens: number;
  total_duration_ms?: number;
  total_tokens_used?: number;
}

// ===== Tool Interface =====

export interface ToolManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  capabilities: string[];
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  requirements?: {
    timeout_ms?: number;
    min_tokens?: number;
    max_tokens?: number;
    requires_auth?: boolean;
    requires_network?: boolean;
  };
  tags?: string[];
  author?: string;
  license?: string;
}

export interface ToolInput {
  parameters: Record<string, any>;
  context: {
    signal_id: string;
    intent: string;
    user_preferences: Record<string, any>;
    previous_step_outputs: Record<string, any>;
  };
  resources: {
    temp_dir: string;
    output_dir: string;
  };
}

export interface ToolOutput {
  success: boolean;
  artifacts: Array<{
    type: 'text' | 'file' | 'image' | 'data';
    content: any;
    metadata: Record<string, any>;
  }>;
  logs?: string[];
  metrics?: {
    duration_ms?: number;
    tokens_used?: number;
    cost_usd?: number;
  };
  error?: string;
}

export interface OuroTool {
  manifest: ToolManifest;
  execute(input: ToolInput): Promise<ToolOutput>;
  healthCheck?(): Promise<boolean>;
  probe?(): Promise<Record<string, any>>;   // Capability introspection
}

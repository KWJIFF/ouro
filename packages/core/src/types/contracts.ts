import { UniversalSignalInput, CapturedSignal } from './signal';
import { ParsedIntent } from './intent';
import { ExecutionPlan } from './execution';
import { Artifact } from './artifact';
import { SignalPattern, Feedback } from './recovery';
import { EvolutionEvent } from './evolution';

export interface SignalProcessor {
  canProcess(input: UniversalSignalInput): boolean;
  process(input: UniversalSignalInput): Promise<CapturedSignal>;
}

export interface IntentParserContract {
  parse(signal: CapturedSignal, context?: Record<string, any>): Promise<ParsedIntent>;
}

export interface ExecutionPlannerContract {
  plan(intent: ParsedIntent, availableTools: ToolManifest[]): Promise<ExecutionPlan>;
}

export interface OuroTool {
  manifest: ToolManifest;
  execute(input: ToolInput): Promise<ToolOutput>;
  probe?(): Promise<Record<string, any>>;
  healthCheck?(): Promise<boolean>;
}

export interface SignalRecoverer {
  recover(signal: CapturedSignal, intent: ParsedIntent, plan: ExecutionPlan, feedback: Feedback[]): Promise<SignalPattern[]>;
}

export interface EvolutionEngineContract {
  evolve(patterns: SignalPattern[]): Promise<EvolutionEvent[]>;
}

export interface AIProvider {
  id: string;
  call(messages: AIMessage[], options?: AICallOptions): Promise<AIResponse>;
  embed(text: string): Promise<number[]>;
  vision?(image: Buffer, prompt: string): Promise<string>;
  speechToText?(audio: Buffer): Promise<string>;
}

export interface StorageBackend {
  put(key: string, data: Buffer, metadata?: Record<string, any>): Promise<string>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export interface ToolManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  capabilities: string[];
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  requirements?: { gpu?: boolean; memory_mb?: number; timeout_ms?: number; network?: boolean; api_keys?: string[] };
  author?: string;
  tags?: string[];
}

export interface ToolInput {
  parameters: Record<string, any>;
  context: { signal_id: string; intent: string; user_preferences: Record<string, any>; previous_step_outputs: Record<string, any> };
  resources: { temp_dir: string; output_dir: string };
}

export interface ToolOutput {
  success: boolean;
  artifacts: Array<{ type: 'file' | 'text' | 'url' | 'data'; content: any; metadata: Record<string, any> }>;
  logs?: string[];
  metrics?: { duration_ms: number; tokens_used?: number; cost_usd?: number };
}

export interface AIMessage { role: 'system' | 'user' | 'assistant'; content: string | Array<{ type: string; [key: string]: any }> }
export interface AICallOptions { model?: string; max_tokens?: number; temperature?: number; json_mode?: boolean }
export interface AIResponse { content: string; model: string; tokens_used: { input: number; output: number }; refused?: boolean }

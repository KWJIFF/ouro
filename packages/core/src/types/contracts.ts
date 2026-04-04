/**
 * The Eight Contracts — The System's Genetic Code
 * 
 * These 8 interfaces ARE the system.
 * Everything else is implementation detail.
 * 
 * Any component can be replaced without affecting any other.
 * Any new capability can be added by implementing the right interface.
 * The system can evolve its own implementations without changing its structure.
 */

import type { CapturedSignal, UniversalSignalInput } from './signal';
import type { ParsedIntent, ParsingContext } from './intent';
import type { ExecutionPlan, ToolManifest, OuroTool, ToolInput, ToolOutput } from './execution';
import type { SignalPattern } from './recovery';
import type { EvolutionEvent } from './evolution';

// ===== Contract 1: Signal Processor =====
export interface SignalProcessor {
  canProcess(input: UniversalSignalInput): boolean;
  process(input: UniversalSignalInput): Promise<CapturedSignal>;
}

// ===== Contract 2: Intent Parser =====
export interface IntentParser {
  parse(signal: CapturedSignal, context?: ParsingContext): Promise<ParsedIntent>;
}

// ===== Contract 3: Execution Planner =====
export interface ExecutionPlanner {
  plan(intent: ParsedIntent, tools: ToolManifest[]): Promise<ExecutionPlan>;
}

// ===== Contract 4: Ouro Tool =====
// (defined in execution.ts as OuroTool interface)

// ===== Contract 5: Signal Recoverer =====
export interface SignalRecoverer {
  recover(
    signal: CapturedSignal,
    intent: ParsedIntent,
    plan: ExecutionPlan,
    feedback: any[],
  ): Promise<SignalPattern[]>;
}

// ===== Contract 6: Evolution Engine =====
export interface EvolutionEngine {
  runCycle(): Promise<EvolutionEvent[]>;
  canEvolve(): Promise<boolean>;
  rollback(eventId: string): Promise<boolean>;
}

// ===== Contract 7: AI Provider =====
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; [key: string]: any }>;
}

export interface AICallOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
}

export interface AIResponse {
  content: string;
  model: string;
  tokens_used: { input: number; output: number };
  refused?: boolean;
}

export interface AIProvider {
  id: string;
  call(messages: AIMessage[], options?: AICallOptions): Promise<AIResponse>;
  embed(text: string): Promise<number[]>;
  vision?(image: Buffer, prompt: string): Promise<string>;
  speechToText?(audio: Buffer): Promise<string>;
}

// ===== Contract 8: Storage Backend =====
export interface StorageBackend {
  upload(buffer: Buffer, filename: string, contentType: string): Promise<string>;
  download(url: string): Promise<Buffer>;
  delete(url: string): Promise<void>;
  exists(url: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
}

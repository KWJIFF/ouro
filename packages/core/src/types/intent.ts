/**
 * Intent Types — Layer 2
 * 
 * An intent is what the human WANTS, not what they SAID.
 * The gap between these is where the meme's intelligence lives.
 */

export type IntentType = 'create' | 'modify' | 'explore' | 'capture' | 'connect' | 'compose';

export interface ParsedIntent {
  id: string;
  signal_id: string;
  intent_type: IntentType;
  confidence: number;           // 0-1, calibrated
  description: string;          // One-sentence natural language summary
  parameters: IntentParameters;
  needs_clarification: boolean;
  clarification_question?: string;
  alternatives?: Array<{        // Other possible interpretations
    intent_type: IntentType;
    confidence: number;
    description: string;
  }>;
}

export interface IntentParameters {
  target_type?: string;          // website, api, document, email, plan, component, etc.
  domain?: string;               // technology, design, business, writing, etc.
  constraints?: string[];        // Explicit constraints from the signal
  references?: string[];         // Referenced previous work or artifacts
  language?: string;             // Target language for translation/i18n
  format?: string;               // Desired output format
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  [key: string]: any;            // Extensible for tool-specific parameters
}

export interface ParsingContext {
  recent_signals: CapturedSignalSummary[];
  personal_model: any;
  active_session: string;
  tool_capabilities: string[];
}

export interface CapturedSignalSummary {
  id: string;
  text: string;
  modality: string;
  intent_type?: string;
  created_at: string;
}

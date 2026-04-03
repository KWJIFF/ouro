export type IntentType = 'create' | 'modify' | 'explore' | 'capture' | 'connect' | 'compose';

export interface ParsedIntent {
  id: string;
  signal_id: string;
  intent_type: IntentType;
  confidence: number;
  description: string;
  parameters: {
    target_type?: string;
    domain?: string;
    constraints?: string[];
    references?: string[];
    [key: string]: any;
  };
  needs_clarification: boolean;
  clarification_question?: string;
}

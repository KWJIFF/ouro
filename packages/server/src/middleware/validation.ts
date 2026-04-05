/**
 * Request Validation — Zod schemas for all API endpoints.
 * 
 * Every input is validated before reaching the service layer.
 * This prevents invalid data from entering the pipeline.
 */

import { z } from 'zod';

// ===== Signal Schemas =====

export const SignalSubmitSchema = z.object({
  text: z.string().min(1, 'Signal text is required').max(50000, 'Signal text too long'),
  modality: z.enum(['text', 'voice', 'image', 'video', 'sketch', 'file', 'composite']).default('text'),
  attachments: z.array(z.object({
    type: z.string(),
    data: z.string().optional(),
    url: z.string().url().optional(),
    filename: z.string().optional(),
    mime_type: z.string().optional(),
    size_bytes: z.number().optional(),
  })).optional(),
  context: z.object({
    session_id: z.string().optional(),
    device: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    preceding_signal_id: z.string().optional(),
  }).optional(),
});

export const SignalClarifySchema = z.object({
  answer: z.string().min(1, 'Clarification answer is required').max(5000),
});

export const SignalListSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  modality: z.enum(['text', 'voice', 'image', 'video', 'sketch', 'file', 'composite']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ===== Feedback Schemas =====

export const FeedbackSubmitSchema = z.object({
  artifact_id: z.string().min(1, 'Artifact ID is required'),
  signal_id: z.string().min(1, 'Signal ID is required'),
  action: z.enum(['accept', 'modify', 'reject', 'fork', 'share', 'iterate']),
  modification: z.object({
    type: z.string().optional(),
    content: z.string().optional(),
    instructions: z.string().optional(),
  }).optional(),
  satisfaction_score: z.number().min(0).max(1).optional(),
  time_to_react_ms: z.number().min(0).optional(),
  view_duration_ms: z.number().min(0).optional(),
  scroll_depth: z.number().min(0).max(1).optional(),
});

// ===== Search Schemas =====

export const SearchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(500),
  limit: z.coerce.number().min(1).max(50).default(10),
  threshold: z.coerce.number().min(0).max(1).default(0.5),
});

// ===== Evolution Schemas =====

export const EvolutionTriggerSchema = z.object({
  force: z.boolean().default(false),
  target_layer: z.number().min(1).max(7).optional(),
  target_component: z.string().optional(),
});

// ===== Tool Schemas =====

export const ToolRegisterSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'ID must be alphanumeric with _ or -'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must be semver'),
  name: z.string().min(1).max(100),
  description: z.string().min(10, 'Description must be at least 10 chars').max(1000),
  capabilities: z.array(z.string().min(1)).min(1, 'At least one capability required'),
  url: z.string().url().optional(),
  input_schema: z.record(z.any()).optional(),
  output_schema: z.record(z.any()).optional(),
  requirements: z.object({
    timeout_ms: z.number().min(1000).max(300000).optional(),
    max_tokens: z.number().min(100).max(100000).optional(),
    requires_api_key: z.boolean().optional(),
  }).optional(),
});

export const ToolGenerateSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 chars').max(2000),
  capabilities: z.array(z.string()).optional(),
  language: z.string().default('typescript'),
});

// ===== Config Schemas =====

export const ConfigUpdateSchema = z.object({
  value: z.any(),
  reason: z.string().optional(),
});

// ===== Connection Schemas =====

export const ConnectionCreateSchema = z.object({
  source_signal_id: z.string().min(1),
  target_signal_id: z.string().min(1),
  connection_type: z.enum(['manual', 'semantic_similarity', 'session_sequence', 'domain_related', 'temporal_cluster']).default('manual'),
  strength: z.number().min(0).max(1).default(0.8),
});

// ===== Admin Schemas =====

export const ReplaySchema = z.object({
  signal_ids: z.array(z.string()).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.number().min(1).max(500).default(20),
  dry_run: z.boolean().default(false),
  compare: z.boolean().default(true),
});

export const ExportSchema = z.object({
  format: z.enum(['json', 'csv', 'markdown']).default('json'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  include_artifacts: z.coerce.boolean().default(false),
  include_patterns: z.coerce.boolean().default(false),
  include_feedback: z.coerce.boolean().default(false),
  anonymize: z.coerce.boolean().default(false),
});

export const ImportSchema = z.object({
  version: z.string(),
  data: z.object({
    signals: z.array(z.any()),
    artifacts: z.array(z.any()).optional(),
    patterns: z.array(z.any()).optional(),
    feedback: z.array(z.any()).optional(),
  }),
});

// ===== Webhook Schemas =====

export const WebhookPayloadSchema = z.object({
  event: z.string().optional(),
  data: z.any(),
  source: z.string().optional(),
  timestamp: z.string().optional(),
});

// ===== Prompt Schemas =====

export const PromptUpdateSchema = z.object({
  content: z.string().min(10, 'Prompt content must be at least 10 chars'),
  variables: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const PromptActivateSchema = z.object({
  version: z.number().min(1),
});

// ===== Validation Helper =====

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Array<{ path: string; message: string }>;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    })),
  };
}

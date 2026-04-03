import { z } from 'zod';

export const SignalInputSchema = z.object({
  text: z.string().optional(),
  content: z.string().optional(),
  signal: z.string().optional(),
  urls: z.array(z.string().url()).optional(),
  context: z.object({
    session_id: z.string().optional(),
    device: z.string().optional(),
    preceding_signal_id: z.string().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
}).refine(data => data.text || data.content || data.signal, {
  message: 'At least one of text, content, or signal must be provided (or upload a file)',
});

export const FeedbackInputSchema = z.object({
  artifact_id: z.string().min(1),
  signal_id: z.string().min(1),
  action: z.enum(['accept', 'modify', 'reject', 'fork', 'share', 'revisit']),
  modification: z.object({
    type: z.enum(['inline_edit', 'instruction', 'regenerate', 'partial_accept']).optional(),
    changes: z.array(z.object({
      location: z.string(),
      before: z.string(),
      after: z.string(),
    })).optional(),
    instruction: z.string().optional(),
  }).optional(),
  time_to_react_ms: z.number().int().positive().optional(),
  view_duration_ms: z.number().int().positive().optional(),
  scroll_depth: z.number().min(0).max(1).optional(),
});

export const ClarifyInputSchema = z.object({
  answer: z.string().min(1),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ToolRegisterSchema = z.object({
  url: z.string().url(),
});

export const ToolGenerateSchema = z.object({
  capability: z.string().min(5),
});

export const ConnectionCreateSchema = z.object({
  source_id: z.string().min(1),
  target_id: z.string().min(1),
  type: z.string().default('manual'),
  strength: z.number().min(0).max(1).default(0.8),
});

export const WebhookInputSchema = z.object({
  text: z.string().optional(),
  message: z.string().optional(),
  content: z.string().optional(),
  urls: z.array(z.string()).optional(),
}).refine(data => data.text || data.message || data.content, {
  message: 'At least one of text, message, or content must be provided',
});

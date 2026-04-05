import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mirror the validation schemas for testing
const SignalSubmitSchema = z.object({
  text: z.string().min(1).max(50000),
  modality: z.enum(['text', 'voice', 'image', 'video', 'sketch', 'file', 'composite']).default('text'),
  attachments: z.array(z.object({ type: z.string() })).optional(),
  context: z.object({ session_id: z.string().optional(), device: z.string().optional() }).optional(),
});

const FeedbackSchema = z.object({
  artifact_id: z.string().min(1),
  signal_id: z.string().min(1),
  action: z.enum(['accept', 'modify', 'reject', 'fork', 'share', 'iterate']),
  satisfaction_score: z.number().min(0).max(1).optional(),
});

const ToolRegisterSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  capabilities: z.array(z.string().min(1)).min(1),
});

const SearchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().min(1).max(50).default(10),
  threshold: z.coerce.number().min(0).max(1).default(0.5),
});

const ConfigSchema = z.object({
  value: z.any(),
  reason: z.string().optional(),
});

describe('API Validation Schemas', () => {
  describe('Signal Submit', () => {
    it('should accept valid signal', () => {
      const result = SignalSubmitSchema.safeParse({ text: 'Build me a website' });
      expect(result.success).toBe(true);
    });

    it('should reject empty text', () => {
      const result = SignalSubmitSchema.safeParse({ text: '' });
      expect(result.success).toBe(false);
    });

    it('should reject text over 50K chars', () => {
      const result = SignalSubmitSchema.safeParse({ text: 'x'.repeat(50001) });
      expect(result.success).toBe(false);
    });

    it('should default modality to text', () => {
      const result = SignalSubmitSchema.parse({ text: 'hello' });
      expect(result.modality).toBe('text');
    });

    it('should accept voice modality', () => {
      const result = SignalSubmitSchema.safeParse({ text: 'voice memo', modality: 'voice' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid modality', () => {
      const result = SignalSubmitSchema.safeParse({ text: 'test', modality: 'telekinesis' });
      expect(result.success).toBe(false);
    });

    it('should accept attachments', () => {
      const result = SignalSubmitSchema.safeParse({
        text: 'test',
        attachments: [{ type: 'image/png' }],
      });
      expect(result.success).toBe(true);
    });

    it('should accept context', () => {
      const result = SignalSubmitSchema.safeParse({
        text: 'test',
        context: { session_id: 'sess1', device: 'mobile' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Feedback Submit', () => {
    it('should accept valid feedback', () => {
      const result = FeedbackSchema.safeParse({
        artifact_id: 'art1', signal_id: 'sig1', action: 'accept',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing artifact_id', () => {
      const result = FeedbackSchema.safeParse({ signal_id: 'sig1', action: 'accept' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid action', () => {
      const result = FeedbackSchema.safeParse({
        artifact_id: 'art1', signal_id: 'sig1', action: 'destroy',
      });
      expect(result.success).toBe(false);
    });

    it('should accept satisfaction score between 0-1', () => {
      const result = FeedbackSchema.safeParse({
        artifact_id: 'art1', signal_id: 'sig1', action: 'accept', satisfaction_score: 0.85,
      });
      expect(result.success).toBe(true);
    });

    it('should reject satisfaction > 1', () => {
      const result = FeedbackSchema.safeParse({
        artifact_id: 'art1', signal_id: 'sig1', action: 'accept', satisfaction_score: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('should accept all 6 action types', () => {
      const actions = ['accept', 'modify', 'reject', 'fork', 'share', 'iterate'];
      for (const action of actions) {
        const result = FeedbackSchema.safeParse({ artifact_id: 'a', signal_id: 's', action });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Tool Register', () => {
    it('should accept valid tool manifest', () => {
      const result = ToolRegisterSchema.safeParse({
        id: 'my_tool', version: '1.0.0', name: 'My Tool',
        description: 'This tool does something useful',
        capabilities: ['useful_thing'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject id with spaces', () => {
      const result = ToolRegisterSchema.safeParse({
        id: 'my tool', version: '1.0.0', name: 'X',
        description: 'description here', capabilities: ['x'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-semver version', () => {
      const result = ToolRegisterSchema.safeParse({
        id: 'x', version: 'latest', name: 'X',
        description: 'description here', capabilities: ['x'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject short description', () => {
      const result = ToolRegisterSchema.safeParse({
        id: 'x', version: '1.0.0', name: 'X',
        description: 'short', capabilities: ['x'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty capabilities', () => {
      const result = ToolRegisterSchema.safeParse({
        id: 'x', version: '1.0.0', name: 'X',
        description: 'description here', capabilities: [],
      });
      expect(result.success).toBe(false);
    });

    it('should accept id with hyphens and underscores', () => {
      const result = ToolRegisterSchema.safeParse({
        id: 'my-tool_v2', version: '2.1.0', name: 'My Tool v2',
        description: 'An improved tool for doing things',
        capabilities: ['better_thing'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Search', () => {
    it('should accept valid search query', () => {
      const result = SearchSchema.safeParse({ q: 'coffee shop' });
      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const result = SearchSchema.safeParse({ q: '' });
      expect(result.success).toBe(false);
    });

    it('should default limit to 10', () => {
      const result = SearchSchema.parse({ q: 'test' });
      expect(result.limit).toBe(10);
    });

    it('should reject limit > 50', () => {
      const result = SearchSchema.safeParse({ q: 'test', limit: 100 });
      expect(result.success).toBe(false);
    });

    it('should default threshold to 0.5', () => {
      const result = SearchSchema.parse({ q: 'test' });
      expect(result.threshold).toBe(0.5);
    });

    it('should coerce string numbers', () => {
      const result = SearchSchema.parse({ q: 'test', limit: '5' });
      expect(result.limit).toBe(5);
    });
  });

  describe('Config Update', () => {
    it('should accept any value type', () => {
      expect(ConfigSchema.safeParse({ value: 42 }).success).toBe(true);
      expect(ConfigSchema.safeParse({ value: 'hello' }).success).toBe(true);
      expect(ConfigSchema.safeParse({ value: [1, 2, 3] }).success).toBe(true);
      expect(ConfigSchema.safeParse({ value: { key: 'val' } }).success).toBe(true);
      expect(ConfigSchema.safeParse({ value: true }).success).toBe(true);
      expect(ConfigSchema.safeParse({ value: null }).success).toBe(true);
    });

    it('should accept optional reason', () => {
      const result = ConfigSchema.safeParse({ value: 42, reason: 'tuning performance' });
      expect(result.success).toBe(true);
    });
  });

  describe('Validation Helper', () => {
    it('should return errors with paths', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
        email: z.string().email(),
      });

      const result = schema.safeParse({ name: '', age: -1, email: 'not-email' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(3);
        const paths = result.error.errors.map(e => e.path.join('.'));
        expect(paths).toContain('name');
        expect(paths).toContain('age');
        expect(paths).toContain('email');
      }
    });

    it('should return data on success', () => {
      const schema = z.object({ name: z.string() });
      const result = schema.safeParse({ name: 'John' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John');
      }
    });
  });
});

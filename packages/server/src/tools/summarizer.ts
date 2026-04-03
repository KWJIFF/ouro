import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'summarizer',
  version: '0.1.0',
  name: 'Content Summarizer',
  description: 'Summarize any content — articles, documents, meeting notes, research papers, books, videos. Produces structured summaries with key points, action items, and insights.',
  capabilities: ['summarization', 'key_points', 'tldr', 'digest', 'meeting_notes'],
  input_schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Content to summarize' },
      format: { type: 'string', description: 'Output format: executive, bullet_points, narrative, action_items, cornell' },
      length: { type: 'string', description: 'Summary length: one_line, short (3-5 sentences), medium (1 page), detailed' },
      audience: { type: 'string', description: 'Who will read this summary' },
      focus: { type: 'string', description: 'What aspect to focus on' },
    },
    required: ['content'],
  },
  output_schema: {
    type: 'object',
    properties: { summary: { type: 'string' }, key_points: { type: 'array' }, action_items: { type: 'array' } },
  },
  tags: ['summary', 'digest', 'analysis', 'notes'],
};

export const summarizerTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { content, format, length, audience, focus } = input.parameters;
    const startTime = Date.now();

    const formatGuide: Record<string, string> = {
      executive: 'Executive summary: Start with the bottom line, then supporting evidence. No jargon.',
      bullet_points: 'Bullet point format: Key points as concise bullets grouped by theme.',
      narrative: 'Narrative summary: Flowing prose that captures the essence.',
      action_items: 'Focus on extracting specific action items, decisions, and next steps.',
      cornell: 'Cornell note format: Main notes, cues/questions in margin, summary at bottom.',
    };

    const response = await callAI([
      {
        role: 'system',
        content: `Summarize the following content.
Format: ${formatGuide[format || 'bullet_points'] || formatGuide.bullet_points}
Length: ${length || 'medium'}
${audience ? `Audience: ${audience}` : ''}
${focus ? `Focus on: ${focus}` : ''}

After the summary, add:
## Key Points
- (3-5 most important takeaways)

## Action Items
- (specific next steps, if any)

## Questions Raised
- (open questions or areas needing further exploration)`,
      },
      { role: 'user', content: content.slice(0, 30000) }, // Limit input length
    ], { temperature: 0.3, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'summary', style: format || 'bullet_points' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

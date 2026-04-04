import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'presentation_outline',
  version: '0.1.0',
  name: 'Presentation Outline',
  description: 'Create detailed presentation outlines with slide-by-slide breakdown, key talking points, transition notes, and timing estimates. Supports various presentation styles and audiences.',
  capabilities: ['presentation_outline', 'talk_prep', 'keynote', 'pitch_deck_outline'],
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string' },
      duration_minutes: { type: 'number' },
      audience: { type: 'string' },
      style: { type: 'string', description: 'keynote, workshop, pitch, educational, lightning_talk' },
    },
    required: ['topic'],
  },
  output_schema: { type: 'object' },
  tags: ['presentation', 'outline', 'speaking'],
};

export const presentationOutlineTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { topic, duration_minutes, audience, style } = input.parameters;
    const startTime = Date.now();
    const response = await callAI([
      {
        role: 'system',
        content: `Create a presentation outline for a ${duration_minutes || 20}-minute ${style || 'professional'} talk.
Audience: ${audience || 'general professional'}

For each slide include:
- Slide title
- Key points (3-5 bullets)
- Visual suggestion
- Talking points (what to SAY, not what to show)
- Transition to next slide
- Estimated time

Also include:
- Opening hook strategy
- Closing call-to-action
- Q&A preparation (3 likely questions with answers)`,
      },
      { role: 'user', content: topic },
    ], { temperature: 0.6, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'presentation_outline' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

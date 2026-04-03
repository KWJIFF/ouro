import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'image_generation',
  version: '0.1.0',
  name: 'Image Generation',
  description: 'Generate images from text descriptions. Creates SVG illustrations, diagrams, and visual compositions programmatically.',
  capabilities: ['image_generation', 'illustration', 'diagram', 'visualization'],
  input_schema: { type: 'object', properties: { prompt: { type: 'string' }, style: { type: 'string' } } },
  output_schema: { type: 'object', properties: { svg: { type: 'string' } } },
  tags: ['image', 'visual', 'design'],
};

export const imageGenTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { prompt, style } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a visual designer. Generate an SVG image based on the description.
Style: ${style || 'clean, modern'}.
Output ONLY the SVG code, starting with <svg> and ending with </svg>.
Use viewBox="0 0 800 600". Make it visually appealing.`,
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.7, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'image', format: 'svg' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

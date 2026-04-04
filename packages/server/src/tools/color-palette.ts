import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'color_palette',
  version: '0.1.0',
  name: 'Color Palette Generator',
  description: 'Generate harmonious color palettes for design projects. Supports various color harmony rules (complementary, analogous, triadic, etc.), accessibility checks, and CSS/design token output.',
  capabilities: ['color_palette', 'color_scheme', 'design_tokens', 'theming'],
  input_schema: {
    type: 'object',
    properties: {
      mood: { type: 'string', description: 'Mood/feeling: warm, cool, energetic, calm, professional, playful' },
      base_color: { type: 'string', description: 'Base color hex (optional)' },
      harmony: { type: 'string', description: 'Color harmony: complementary, analogous, triadic, split-complementary, monochromatic' },
      count: { type: 'number', description: 'Number of colors (default: 5)' },
      output_format: { type: 'string', description: 'css_variables, tailwind, design_tokens, json' },
    },
    required: ['mood'],
  },
  output_schema: { type: 'object', properties: { palette: { type: 'array' }, css: { type: 'string' } } },
  tags: ['color', 'palette', 'design', 'theming'],
};

export const colorPaletteTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { mood, base_color, harmony, count, output_format } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `Generate a color palette.
Mood: ${mood}
${base_color ? `Base color: ${base_color}` : ''}
Harmony: ${harmony || 'complementary'}
Colors: ${count || 5}
Format: ${output_format || 'all'}

Output:
1. Color swatches with hex, RGB, HSL values
2. Color names/roles (primary, secondary, accent, background, text)
3. CSS custom properties
4. Tailwind config excerpt
5. Accessibility notes (contrast ratios for text on each background)
6. Usage suggestions

Format as structured markdown with code blocks.`,
      },
      { role: 'user', content: `Create a ${mood} color palette` },
    ], { temperature: 0.7, max_tokens: 2048 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'design', format: 'color_palette', mood } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

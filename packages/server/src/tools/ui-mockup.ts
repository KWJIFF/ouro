import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'ui_mockup',
  version: '0.1.0',
  name: 'UI Mockup Generator',
  description: 'Generate UI mockups as HTML/CSS implementations. Creates responsive, visually polished interface mockups from text descriptions including layout, styling, interactions, and responsive behavior.',
  capabilities: ['ui_design', 'mockup', 'wireframe', 'interface', 'frontend', 'prototype'],
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'What the UI should look like and do' },
      type: { type: 'string', description: 'Type: dashboard, landing_page, form, settings, profile, mobile_app, admin_panel' },
      style: { type: 'string', description: 'Visual style: minimal, corporate, playful, dark, glassmorphism' },
      framework: { type: 'string', description: 'CSS framework preference: tailwind, plain_css, bootstrap' },
      responsive: { type: 'boolean', description: 'Include mobile responsive design' },
    },
    required: ['description'],
  },
  output_schema: {
    type: 'object',
    properties: { html: { type: 'string' }, components: { type: 'array' } },
  },
  tags: ['ui', 'design', 'mockup', 'frontend', 'prototype'],
};

export const uiMockupTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { description, type, style, framework, responsive } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a UI/UX designer and frontend developer.
Generate a complete, visually polished HTML mockup.

UI Type: ${type || 'generic'}
Style: ${style || 'modern minimal'}
Framework: ${framework || 'plain CSS (inline styles)'}
Responsive: ${responsive !== false ? 'Yes, include mobile breakpoints' : 'Desktop only'}

Requirements:
- Complete, self-contained HTML file (no external dependencies unless using CDN frameworks)
- Realistic placeholder content (not lorem ipsum)
- Proper visual hierarchy, spacing, and typography
- Interactive elements should look clickable
- Use a cohesive color palette
- If dashboard: include charts (as colored divs/SVG), metrics cards, sidebar navigation
- If landing page: include hero, features, testimonials, CTA, footer
- If form: include validation states, proper labels, helpful microcopy

Output ONLY the complete HTML file.`,
      },
      { role: 'user', content: description },
    ], { temperature: 0.7, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{
        type: 'text',
        content: response.content,
        metadata: { type: 'website', format: 'html', subtype: 'mockup', ui_type: type || 'generic' },
      }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

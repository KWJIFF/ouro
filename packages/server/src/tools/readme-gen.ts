import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'readme_generator',
  version: '0.1.0',
  name: 'README Generator',
  description: 'Generate comprehensive README documentation for projects. Includes overview, installation, usage, API reference, configuration, contributing guidelines, and more.',
  capabilities: ['readme', 'documentation', 'project_docs', 'api_docs'],
  input_schema: {
    type: 'object',
    properties: {
      project_info: { type: 'string', description: 'What the project does' },
      code_context: { type: 'string', description: 'Code or file structure for context' },
      sections: { type: 'array', items: { type: 'string' }, description: 'Sections to include' },
      style: { type: 'string', description: 'Style: concise, detailed, tutorial, reference' },
    },
    required: ['project_info'],
  },
  output_schema: { type: 'object', properties: { readme: { type: 'string' } } },
  tags: ['documentation', 'readme', 'docs'],
};

export const readmeGenTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { project_info, code_context, sections, style } = input.parameters;
    const startTime = Date.now();

    const defaultSections = ['Overview', 'Features', 'Quick Start', 'Installation', 'Usage', 'Configuration', 'API Reference', 'Contributing', 'License'];

    const response = await callAI([
      {
        role: 'system',
        content: `Generate a comprehensive README.md.
Style: ${style || 'detailed'}
Sections: ${(sections || defaultSections).join(', ')}
${code_context ? `Code context:\n${code_context}` : ''}

Write in clean markdown with:
- Badges at top (build status, version, license)
- Clear installation steps with copy-pasteable commands
- Usage examples with code blocks
- Configuration tables
- Contributing guidelines
- Professional tone but approachable`,
      },
      { role: 'user', content: project_info },
    ], { temperature: 0.6, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'markdown', subtype: 'readme' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

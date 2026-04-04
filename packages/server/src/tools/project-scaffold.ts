import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'project_scaffold',
  version: '0.1.0',
  name: 'Project Scaffolder',
  description: 'Generate complete project structures with directory hierarchy, configuration files, boilerplate code, package.json, docker files, CI/CD, and README. Supports React, Next.js, Express, FastAPI, Flutter, and more.',
  capabilities: ['project_scaffold', 'boilerplate', 'starter', 'template', 'project_init'],
  input_schema: {
    type: 'object',
    properties: {
      project_type: { type: 'string', description: 'Type: react, nextjs, express, fastapi, flutter, cli, library, monorepo' },
      name: { type: 'string', description: 'Project name' },
      features: { type: 'array', items: { type: 'string' }, description: 'Features to include: auth, database, docker, ci, testing, i18n' },
      description: { type: 'string', description: 'What the project does' },
    },
    required: ['description'],
  },
  output_schema: { type: 'object', properties: { files: { type: 'array' } } },
  tags: ['scaffold', 'project', 'boilerplate', 'init'],
};

export const projectScaffoldTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { project_type, name, features, description } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a project scaffold generator. Create a complete project structure.
Type: ${project_type || 'auto-detect from description'}
Name: ${name || 'my-project'}
Features: ${(features || ['docker', 'testing']).join(', ')}

Output a complete project scaffold with:
1. Directory tree structure
2. package.json (or equivalent)
3. Main entry point files
4. Configuration files (tsconfig, eslint, prettier, docker, etc.)
5. README with setup instructions
6. Basic test setup
7. CI/CD workflow

Format each file as:
--- path/to/file ---
[file content]

Make it production-ready with best practices.`,
      },
      { role: 'user', content: description },
    ], { temperature: 0.5, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'code', format: 'project_scaffold', project_type: project_type || 'auto' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

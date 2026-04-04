import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'git_helper',
  version: '0.1.0',
  name: 'Git Helper',
  description: 'Generate git commands, commit messages, branching strategies, .gitignore files, and resolve merge conflicts. Explains git concepts and best practices.',
  capabilities: ['git', 'version_control', 'commit_message', 'branching', 'merge_conflict'],
  input_schema: {
    type: 'object',
    properties: {
      request: { type: 'string', description: 'What git help is needed' },
      context: { type: 'string', description: 'Current git state or diff' },
      type: { type: 'string', description: 'command, commit_message, gitignore, branching_strategy, conflict_resolution' },
    },
    required: ['request'],
  },
  output_schema: { type: 'object', properties: { output: { type: 'string' } } },
  tags: ['git', 'version_control', 'devops'],
};

export const gitHelperTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { request, context, type } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a git expert.
${type === 'commit_message' ? 'Generate a conventional commit message (feat/fix/docs/style/refactor/test/chore).' : ''}
${type === 'gitignore' ? 'Generate a comprehensive .gitignore file.' : ''}
${type === 'branching_strategy' ? 'Recommend a branching strategy (git flow, trunk-based, etc.).' : ''}
${context ? `Current context:\n${context}` : ''}
Be specific and practical.`,
      },
      { role: 'user', content: request },
    ], { temperature: 0.3, max_tokens: 2048 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'code', format: 'git', subtype: type || 'general' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'debugger',
  version: '0.1.0',
  name: 'Code Debugger',
  description: 'Analyze code for bugs, performance issues, security vulnerabilities, and anti-patterns. Provides detailed diagnosis with specific fixes and explanations.',
  capabilities: ['debugging', 'code_review', 'security_audit', 'performance_analysis', 'bug_fix'],
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Code to analyze' },
      error: { type: 'string', description: 'Error message or description of the problem' },
      language: { type: 'string', description: 'Programming language' },
      focus: { type: 'string', description: 'Focus area: bugs, performance, security, style, all' },
    },
    required: ['code'],
  },
  output_schema: {
    type: 'object',
    properties: {
      issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, description: { type: 'string' }, fix: { type: 'string' } } } },
      fixed_code: { type: 'string' },
    },
  },
  tags: ['debug', 'code_review', 'security', 'performance'],
};

export const debuggerTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { code, error, language, focus } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a senior code reviewer and debugger.
Language: ${language || 'auto-detect'}
Focus: ${focus || 'all'}
${error ? `Reported error: ${error}` : ''}

Analyze this code and provide:

## Issues Found
For each issue:
- **Severity**: Critical / High / Medium / Low
- **Line(s)**: Where the issue is
- **Problem**: What's wrong
- **Fix**: Specific code change

## Fixed Code
Provide the complete fixed version of the code.

## Recommendations
Any architectural or style improvements.

Be thorough but practical. Prioritize by severity.`,
      },
      { role: 'user', content: code },
    ], { temperature: 0.3, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'code', format: 'code_review', language: language || 'auto' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

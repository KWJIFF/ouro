import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'code_review',
  version: '0.1.0',
  name: 'Code Review Assistant',
  description: 'Perform thorough code reviews covering correctness, performance, security, maintainability, testing gaps, and architectural concerns. Provides line-level comments and an overall assessment with severity ratings.',
  capabilities: ['code_review', 'security_audit', 'performance_review', 'architecture_review', 'best_practices'],
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Code to review' },
      language: { type: 'string', description: 'Programming language' },
      context: { type: 'string', description: 'What this code does, PR description, etc.' },
      focus: { type: 'string', description: 'Focus areas: all, security, performance, style, architecture' },
      severity_threshold: { type: 'string', description: 'Minimum severity to report: info, warning, error, critical' },
    },
    required: ['code'],
  },
  output_schema: {
    type: 'object',
    properties: {
      issues: { type: 'array' },
      summary: { type: 'string' },
      score: { type: 'number' },
    },
  },
  tags: ['code_review', 'quality', 'security', 'performance'],
};

export const codeReviewTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { code, language, context, focus, severity_threshold } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a senior code reviewer performing a thorough review.
Language: ${language || 'auto-detect'}
Focus: ${focus || 'all'}
Min severity: ${severity_threshold || 'info'}
${context ? `Context: ${context}` : ''}

Review structure:

## Overall Assessment
Score: X/10
One paragraph summary of code quality.

## Issues Found
For each issue:
### [SEVERITY] Issue Title
- **Location**: Line(s) or function name
- **Category**: correctness | performance | security | maintainability | style | testing
- **Problem**: What's wrong
- **Impact**: Why it matters
- **Fix**: Specific code change (show before/after)

Severity levels: 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low | ℹ️ Info

## Positive Aspects
What's done well (important for balanced feedback).

## Recommendations
Architectural or strategic improvements.

Be thorough but constructive. Every criticism should come with a specific fix.`,
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

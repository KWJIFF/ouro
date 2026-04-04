import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'regex_builder',
  version: '0.1.0',
  name: 'Regex Builder',
  description: 'Build, explain, and test regular expressions from natural language descriptions. Supports JavaScript, Python, Go, and PCRE syntax. Includes test cases and edge case analysis.',
  capabilities: ['regex', 'pattern_matching', 'text_processing', 'validation'],
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'What the regex should match' },
      examples: { type: 'array', items: { type: 'string' }, description: 'Example strings that should match' },
      counter_examples: { type: 'array', items: { type: 'string' }, description: 'Example strings that should NOT match' },
      flavor: { type: 'string', description: 'Regex flavor: javascript, python, go, pcre' },
    },
    required: ['description'],
  },
  output_schema: { type: 'object', properties: { regex: { type: 'string' }, explanation: { type: 'string' }, tests: { type: 'array' } } },
  tags: ['regex', 'pattern', 'validation', 'text'],
};

export const regexBuilderTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { description, examples, counter_examples, flavor } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `Build a regular expression.
Flavor: ${flavor || 'JavaScript'}
${examples ? `Must match: ${examples.join(', ')}` : ''}
${counter_examples ? `Must NOT match: ${counter_examples.join(', ')}` : ''}

Provide:
1. The regex pattern
2. Character-by-character explanation
3. Test cases (5+ matches, 5+ non-matches)
4. Edge cases to watch out for
5. Usage example in code`,
      },
      { role: 'user', content: description },
    ], { temperature: 0.3, max_tokens: 2048 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'code', format: 'regex', flavor: flavor || 'javascript' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

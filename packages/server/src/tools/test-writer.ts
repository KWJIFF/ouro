import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'test_writer',
  version: '0.1.0',
  name: 'Test Writer',
  description: 'Generate comprehensive test suites for code. Supports unit tests, integration tests, E2E tests. Works with Jest, Vitest, Pytest, Go testing, and more.',
  capabilities: ['testing', 'unit_test', 'integration_test', 'e2e_test', 'test_generation'],
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Code to write tests for' },
      framework: { type: 'string', description: 'Test framework: jest, vitest, pytest, go_test, mocha' },
      type: { type: 'string', description: 'Test type: unit, integration, e2e, all' },
      coverage_target: { type: 'string', description: 'Areas to focus on: edge_cases, error_handling, happy_path, all' },
    },
    required: ['code'],
  },
  output_schema: { type: 'object', properties: { tests: { type: 'string' } } },
  tags: ['testing', 'quality', 'test_generation'],
};

export const testWriterTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { code, framework, type, coverage_target } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a test engineer. Write comprehensive tests.
Framework: ${framework || 'auto-detect from code'}
Type: ${type || 'unit'}
Coverage focus: ${coverage_target || 'all'}

Write tests that cover:
1. Happy path — normal expected behavior
2. Edge cases — boundary values, empty inputs, max values
3. Error handling — invalid inputs, thrown exceptions
4. Integration points — function interactions
5. Regression guards — common bugs in similar code

Include descriptive test names and meaningful assertions.
Output ONLY the test file code.`,
      },
      { role: 'user', content: code },
    ], { temperature: 0.4, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'code', format: 'test', framework: framework || 'auto' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

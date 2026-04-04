import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'json_transformer',
  version: '0.1.0',
  name: 'JSON Transformer',
  description: 'Transform, validate, query, and generate JSON/YAML data structures. Convert between formats, generate TypeScript types from JSON, create mock data, and build JSON schemas.',
  capabilities: ['json', 'yaml', 'data_transform', 'schema_generation', 'mock_data', 'type_generation'],
  input_schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', description: 'transform, validate, to_typescript, to_schema, generate_mock, json_to_yaml, yaml_to_json, query' },
      data: { type: 'string', description: 'Input JSON/YAML data' },
      instruction: { type: 'string', description: 'What to do with the data' },
    },
    required: ['operation'],
  },
  output_schema: { type: 'object', properties: { result: { type: 'string' } } },
  tags: ['json', 'yaml', 'data', 'transform', 'schema'],
};

export const jsonTransformerTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { operation, data, instruction } = input.parameters;
    const startTime = Date.now();

    const ops: Record<string, string> = {
      transform: 'Transform this JSON according to the instruction.',
      validate: 'Validate this JSON. Report any syntax errors, structural issues, or data quality problems.',
      to_typescript: 'Generate TypeScript interface/type definitions from this JSON structure.',
      to_schema: 'Generate a JSON Schema (draft-07) for this data structure.',
      generate_mock: 'Generate realistic mock data matching this structure.',
      json_to_yaml: 'Convert this JSON to YAML.',
      yaml_to_json: 'Convert this YAML to JSON.',
      query: 'Query/extract data from this JSON as instructed.',
    };

    const response = await callAI([
      {
        role: 'system',
        content: `You are a data transformation expert.
Operation: ${ops[operation] || operation}
${instruction ? `Instruction: ${instruction}` : ''}

Output ONLY the result (no explanations unless it's a validation report).`,
      },
      { role: 'user', content: data || instruction || '' },
    ], { temperature: 0.2, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'data', format: 'json', operation } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

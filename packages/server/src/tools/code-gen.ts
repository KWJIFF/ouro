import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'code_generation',
  version: '0.1.0',
  name: 'Code Generation',
  description: 'Generate code in any programming language. Can create scripts, components, full projects, APIs, algorithms, and any other code artifact.',
  capabilities: ['code_generation', 'scripting', 'project_scaffold', 'api_builder'],
  input_schema: { type: 'object', properties: { prompt: { type: 'string' }, language: { type: 'string' }, framework: { type: 'string' } } },
  output_schema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' }, filename: { type: 'string' } } },
  tags: ['code', 'development'],
};

export const codeGenTool: OuroTool = {
  manifest,

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { prompt, language, framework } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a code generator. Write clean, production-quality code.
If a language/framework is specified, use it. Otherwise, choose the best fit.
Output ONLY the code, no explanations. If multiple files are needed, separate them with "--- filename.ext ---" headers.`,
      },
      {
        role: 'user',
        content: `${prompt}${language ? `\nLanguage: ${language}` : ''}${framework ? `\nFramework: ${framework}` : ''}`,
      },
    ], { temperature: 0.4, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { language: language || 'auto', type: 'code' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

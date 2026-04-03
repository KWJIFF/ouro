import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'doc_writer',
  version: '0.1.0',
  name: 'Document Writer',
  description: 'Write documents, articles, reports, essays, plans, and any text-based content in markdown format.',
  capabilities: ['document_writing', 'article_writing', 'report_generation', 'planning'],
  input_schema: { type: 'object', properties: { prompt: { type: 'string' }, style: { type: 'string' }, length: { type: 'string' } } },
  output_schema: { type: 'object', properties: { document: { type: 'string' } } },
  tags: ['writing', 'documents'],
};

export const docWriterTool: OuroTool = {
  manifest,

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { prompt, style, length } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are an expert writer. Write in markdown format.
Style: ${style || 'professional'}. Length: ${length || 'as needed'}.
Write complete, polished content ready for publication or use.`,
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.7, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'markdown' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

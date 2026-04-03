import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'web_research',
  version: '0.1.0',
  name: 'Web Research',
  description: 'Research topics by synthesizing knowledge. Provides comprehensive analysis, comparisons, and summaries.',
  capabilities: ['research', 'analysis', 'summarization', 'comparison'],
  input_schema: { type: 'object', properties: { query: { type: 'string' }, depth: { type: 'string' } } },
  output_schema: { type: 'object', properties: { research: { type: 'string' } } },
  tags: ['research', 'analysis'],
};

export const webResearchTool: OuroTool = {
  manifest,

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { query, depth } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a research analyst. Provide thorough, factual, well-structured research.
Depth: ${depth || 'comprehensive'}. Include key findings, comparisons, and actionable insights.`,
      },
      { role: 'user', content: query },
    ], { temperature: 0.5, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'research' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

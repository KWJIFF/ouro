import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'data_analyzer',
  version: '0.1.0',
  name: 'Data Analyzer',
  description: 'Analyze data, generate statistics, create data visualizations, process CSV/JSON data, and perform computations.',
  capabilities: ['data_analysis', 'statistics', 'visualization', 'computation', 'csv_processing'],
  input_schema: { type: 'object', properties: { data: { type: 'string' }, query: { type: 'string' }, format: { type: 'string' } } },
  output_schema: { type: 'object', properties: { analysis: { type: 'string' }, visualization: { type: 'string' } } },
  tags: ['data', 'analysis', 'statistics'],
};

export const dataAnalyzerTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { data, query: analysisQuery, format } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a data analyst. Analyze the provided data and answer the query.
If the data is CSV or tabular, parse it first. Provide:
1. Key findings (clear, concise)
2. Statistical summary if applicable
3. Recommendations or insights
If a visualization would help, describe what it would look like.`,
      },
      { role: 'user', content: `Data:\n${data || 'No data provided'}\n\nAnalysis request: ${analysisQuery || 'General analysis'}` },
    ], { temperature: 0.3, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'data', format: 'analysis' } }],
      metrics: { duration_ms: Date.now() - startTime },
    };
  },
};

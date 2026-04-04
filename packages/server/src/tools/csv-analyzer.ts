import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'csv_analyzer',
  version: '0.1.0',
  name: 'CSV/Spreadsheet Analyzer',
  description: 'Analyze CSV and tabular data. Compute statistics, find patterns, generate charts, clean data, and produce summary reports. Handles missing values, outliers, and correlations.',
  capabilities: ['csv_analysis', 'spreadsheet', 'statistics', 'data_cleaning', 'pivot_table'],
  input_schema: {
    type: 'object',
    properties: {
      data: { type: 'string', description: 'CSV data or description of the dataset' },
      operation: { type: 'string', description: 'analyze, clean, summarize, pivot, correlate, visualize' },
      columns: { type: 'array', items: { type: 'string' }, description: 'Specific columns to focus on' },
      query: { type: 'string', description: 'Specific question about the data' },
    },
    required: ['data'],
  },
  output_schema: { type: 'object', properties: { analysis: { type: 'string' }, statistics: { type: 'object' } } },
  tags: ['csv', 'data', 'spreadsheet', 'statistics', 'analytics'],
};

export const csvAnalyzerTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { data, operation, columns, query: dataQuery } = input.parameters;
    const startTime = Date.now();

    const ops: Record<string, string> = {
      analyze: 'Perform a comprehensive statistical analysis including: descriptive stats (mean, median, std, quartiles), distribution shape, missing values, outliers (IQR method), and notable patterns.',
      clean: 'Clean this data: handle missing values (report strategy), remove duplicates, fix data types, standardize formats, and flag anomalies.',
      summarize: 'Produce a concise executive summary of this dataset: what it contains, key metrics, notable trends, and actionable insights.',
      pivot: 'Create a pivot table analysis showing cross-tabulations, aggregations, and dimensional breakdowns.',
      correlate: 'Compute correlations between all numeric columns. Highlight strong correlations (>0.7 or <-0.7) and suggest causal hypotheses.',
      visualize: 'Suggest the best visualization types for this data and describe what each would show. Include chart specifications (type, axes, colors, labels).',
    };

    const response = await callAI([
      {
        role: 'system',
        content: `You are a data analyst. ${ops[operation || 'analyze'] || ops.analyze}
${columns?.length ? `Focus on columns: ${columns.join(', ')}` : ''}
${dataQuery ? `Specific question: ${dataQuery}` : ''}

If the data is CSV, parse it first. Present findings in clear markdown with tables where helpful.`,
      },
      { role: 'user', content: data.slice(0, 20000) },
    ], { temperature: 0.3, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'data', format: 'analysis', operation: operation || 'analyze' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

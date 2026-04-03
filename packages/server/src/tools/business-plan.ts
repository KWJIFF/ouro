import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'business_plan',
  version: '0.1.0',
  name: 'Business Plan Generator',
  description: 'Generate comprehensive business plans including executive summary, market analysis, competitive landscape, revenue model, go-to-market strategy, financial projections, and risk assessment.',
  capabilities: ['business_plan', 'strategy', 'market_analysis', 'financial_projection', 'startup'],
  input_schema: {
    type: 'object',
    properties: {
      idea: { type: 'string', description: 'Business idea or concept' },
      industry: { type: 'string', description: 'Industry or market' },
      stage: { type: 'string', description: 'Stage: idea, mvp, growth, scale' },
      target_market: { type: 'string', description: 'Target customer segment' },
      budget: { type: 'string', description: 'Available budget or funding stage' },
      sections: { type: 'array', items: { type: 'string' }, description: 'Specific sections to include' },
    },
    required: ['idea'],
  },
  output_schema: {
    type: 'object',
    properties: { plan: { type: 'string' }, sections: { type: 'array' } },
  },
  tags: ['business', 'strategy', 'planning', 'startup'],
};

export const businessPlanTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { idea, industry, stage, target_market, budget, sections } = input.parameters;
    const startTime = Date.now();

    const defaultSections = [
      'Executive Summary',
      'Problem & Solution',
      'Market Analysis',
      'Competitive Landscape',
      'Business Model & Revenue',
      'Go-to-Market Strategy',
      'Team & Operations',
      'Financial Projections (3-year)',
      'Risk Assessment & Mitigation',
      'Milestones & Timeline',
    ];

    const requestedSections = sections || defaultSections;

    const response = await callAI([
      {
        role: 'system',
        content: `You are a business strategy consultant. Generate a comprehensive business plan.

Business idea: ${idea}
${industry ? `Industry: ${industry}` : ''}
${stage ? `Stage: ${stage}` : 'Stage: idea'}
${target_market ? `Target market: ${target_market}` : ''}
${budget ? `Budget context: ${budget}` : ''}

Include these sections:
${requestedSections.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

Make it thorough, data-informed (use realistic estimates), and actionable.
Format in clean markdown with headers, sub-sections, and bullet points.
For financial projections, include a simple table.`,
      },
      { role: 'user', content: `Create a business plan for: ${idea}` },
    ], { temperature: 0.6, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{
        type: 'text',
        content: response.content,
        metadata: { type: 'document', format: 'markdown', subtype: 'business_plan', sections: requestedSections },
      }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

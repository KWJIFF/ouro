import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'competitor_analysis',
  version: '0.1.0',
  name: 'Competitor Analysis',
  description: 'Perform detailed competitive analysis including market positioning, feature comparison, pricing analysis, SWOT for each competitor, and strategic recommendations.',
  capabilities: ['competitive_analysis', 'market_research', 'swot', 'positioning'],
  input_schema: {
    type: 'object',
    properties: {
      product: { type: 'string', description: 'Your product/service' },
      competitors: { type: 'array', items: { type: 'string' } },
      industry: { type: 'string' },
      focus: { type: 'string', description: 'pricing, features, positioning, all' },
    },
    required: ['product'],
  },
  output_schema: { type: 'object' },
  tags: ['competitor', 'analysis', 'market', 'strategy'],
};

export const competitorAnalysisTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { product, competitors, industry, focus } = input.parameters;
    const startTime = Date.now();
    const response = await callAI([
      {
        role: 'system',
        content: `Perform a competitive analysis for ${product} in the ${industry || 'technology'} industry.
${competitors?.length ? `Key competitors: ${competitors.join(', ')}` : 'Identify 3-5 key competitors.'}
Focus: ${focus || 'all'}

Include:
1. Market Overview (size, growth, key trends)
2. Competitor Profiles (for each: overview, strengths, weaknesses, pricing, target market)
3. Feature Comparison Matrix
4. SWOT Analysis (for your product vs. market)
5. Positioning Map (describe a 2x2 matrix placement)
6. Strategic Recommendations (3-5 actionable insights)
7. Opportunities and Threats`,
      },
      { role: 'user', content: `Competitive analysis for: ${product}` },
    ], { temperature: 0.5, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'competitive_analysis' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

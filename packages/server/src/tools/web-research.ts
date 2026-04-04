import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'web_research',
  version: '0.2.0',
  name: 'Web Research',
  description: 'Research any topic by synthesizing knowledge into structured, actionable reports. Supports multiple output formats: executive brief, deep dive, comparison, trend analysis, literature review, and competitive analysis.',
  capabilities: [
    'research', 'analysis', 'summarization', 'comparison',
    'trend_analysis', 'competitive_analysis', 'literature_review',
    'fact_checking', 'market_research',
  ],
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Research question or topic' },
      depth: { type: 'string', description: 'quick (1 paragraph), standard (1 page), deep (full report)' },
      format: { type: 'string', description: 'executive_brief, deep_dive, comparison, trend, competitive, literature_review' },
      focus_areas: { type: 'array', items: { type: 'string' }, description: 'Specific aspects to focus on' },
      audience: { type: 'string', description: 'Who will read this: technical, executive, general, academic' },
    },
    required: ['query'],
  },
  output_schema: {
    type: 'object',
    properties: {
      research: { type: 'string' },
      key_findings: { type: 'array', items: { type: 'string' } },
      confidence: { type: 'number' },
    },
  },
  tags: ['research', 'analysis', 'knowledge'],
};

export const webResearchTool: OuroTool = {
  manifest,

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { query, depth, format, focus_areas, audience } = input.parameters;
    const startTime = Date.now();

    const formatTemplates: Record<string, string> = {
      executive_brief: `Write an executive brief (1-2 pages):
- Bottom line up front (BLUF)
- 3-5 key findings with supporting evidence
- Risk assessment
- Recommended actions
- No jargon. Decision-maker oriented.`,

      deep_dive: `Write a comprehensive research report:
- Executive summary
- Background and context
- Methodology note (what sources and reasoning)
- Detailed findings (organized by theme)
- Analysis and implications
- Limitations and gaps
- Conclusions and recommendations
- Suggested further reading`,

      comparison: `Write a structured comparison:
- Overview of what's being compared
- Comparison matrix (feature-by-feature)
- Strengths and weaknesses of each
- Use case recommendations ("Choose X if...", "Choose Y if...")
- Overall verdict`,

      trend: `Write a trend analysis:
- Current state of the field
- Historical trajectory (how we got here)
- Key trends with evidence
- Emerging signals (weak but potentially significant)
- Projections (1-year, 3-year, 5-year)
- Implications for practitioners`,

      competitive: `Write a competitive analysis:
- Market overview
- Key players and their positions
- Competitive matrix
- Differentiators and gaps
- Market dynamics and power shifts
- Strategic recommendations`,

      literature_review: `Write an academic-style literature review:
- Research question framing
- Methodology (search strategy, inclusion criteria)
- Thematic synthesis of findings
- Debates and contradictions in the literature
- Gaps in current knowledge
- Directions for future research`,
    };

    const selectedFormat = formatTemplates[format || 'deep_dive'] || formatTemplates.deep_dive;
    const depthGuide = depth === 'quick' ? 'Keep it under 500 words.' :
                       depth === 'deep' ? 'Be thorough. 2000+ words is fine.' :
                       'Aim for 800-1200 words.';

    const response = await callAI([
      {
        role: 'system',
        content: `You are a research analyst. ${depthGuide}
Audience: ${audience || 'general professional'}
${focus_areas?.length ? `Focus specifically on: ${focus_areas.join(', ')}` : ''}

${selectedFormat}

Use clean markdown formatting. Be factual, cite specific data points where possible. Distinguish between established facts, expert consensus, and your analytical inferences.`,
      },
      { role: 'user', content: query },
    ], {
      temperature: 0.5,
      max_tokens: depth === 'deep' ? 8192 : depth === 'quick' ? 1024 : 4096,
    });

    return {
      success: true,
      artifacts: [{
        type: 'text',
        content: response.content,
        metadata: {
          type: 'research',
          format: format || 'deep_dive',
          depth: depth || 'standard',
          audience: audience || 'general',
          query,
        },
      }],
      metrics: {
        duration_ms: Date.now() - startTime,
        tokens_used: response.tokens_used.input + response.tokens_used.output,
      },
    };
  },
};

import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'seo_optimizer',
  version: '0.1.0',
  name: 'SEO Optimizer',
  description: 'Analyze and optimize content for search engines. Generate meta tags, keywords, content suggestions, structured data, and SEO audit reports.',
  capabilities: ['seo', 'meta_tags', 'keywords', 'content_optimization', 'structured_data'],
  input_schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Content to optimize' },
      target_keywords: { type: 'array', items: { type: 'string' } },
      url: { type: 'string' },
      type: { type: 'string', description: 'audit, optimize, generate_meta, keywords, structured_data' },
    },
    required: ['content'],
  },
  output_schema: { type: 'object' },
  tags: ['seo', 'marketing', 'content', 'optimization'],
};

export const seoOptimizerTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { content, target_keywords, url, type } = input.parameters;
    const startTime = Date.now();
    const response = await callAI([
      {
        role: 'system',
        content: `You are an SEO expert. ${type === 'audit' ? 'Perform a comprehensive SEO audit.' : type === 'generate_meta' ? 'Generate optimized meta tags.' : type === 'keywords' ? 'Perform keyword research.' : type === 'structured_data' ? 'Generate JSON-LD structured data.' : 'Optimize this content for search engines.'}
${target_keywords?.length ? `Target keywords: ${target_keywords.join(', ')}` : ''}
${url ? `URL: ${url}` : ''}

Provide:
1. Title tag (60 chars max) — 3 variations
2. Meta description (155 chars max) — 3 variations  
3. H1-H3 heading structure
4. Keyword density analysis
5. Internal linking suggestions
6. Image alt text suggestions
7. Schema.org structured data (JSON-LD)
8. Content improvement recommendations
9. Readability score estimate
10. Mobile-friendliness notes`,
      },
      { role: 'user', content: content.slice(0, 15000) },
    ], { temperature: 0.4, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'seo_analysis' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

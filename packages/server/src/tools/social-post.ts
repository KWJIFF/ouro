import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'social_post',
  version: '0.1.0',
  name: 'Social Media Post Writer',
  description: 'Write engaging social media posts for Twitter/X, LinkedIn, Instagram, Facebook, Reddit, and Product Hunt. Handles platform-specific formatting, hashtags, and engagement optimization.',
  capabilities: ['social_media', 'twitter', 'linkedin', 'instagram', 'copywriting', 'marketing'],
  input_schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'What to post about' },
      platform: { type: 'string', description: 'twitter, linkedin, instagram, facebook, reddit, producthunt, threads' },
      tone: { type: 'string', description: 'professional, casual, humorous, inspirational, controversial' },
      goal: { type: 'string', description: 'engagement, traffic, awareness, conversion' },
      include_hashtags: { type: 'boolean', description: 'Include relevant hashtags' },
    },
    required: ['content'],
  },
  output_schema: { type: 'object', properties: { posts: { type: 'array' } } },
  tags: ['social_media', 'marketing', 'copywriting'],
};

export const socialPostTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { content, platform, tone, goal, include_hashtags } = input.parameters;
    const startTime = Date.now();

    const platformLimits: Record<string, number> = {
      twitter: 280, linkedin: 3000, instagram: 2200,
      facebook: 5000, reddit: 40000, threads: 500,
    };

    const response = await callAI([
      {
        role: 'system',
        content: `Write social media posts.
Platform: ${platform || 'twitter, linkedin (both)'}
Tone: ${tone || 'professional'}
Goal: ${goal || 'engagement'}
${include_hashtags !== false ? 'Include relevant hashtags.' : 'No hashtags.'}
${platform && platformLimits[platform] ? `Character limit: ${platformLimits[platform]}` : ''}

Generate 3 variations with different angles:
1. Direct/informative
2. Story/narrative
3. Question/engagement-focused

For each, provide the post text and a brief note on why that angle works.`,
      },
      { role: 'user', content: content },
    ], { temperature: 0.8, max_tokens: 2048 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'social_post', platform: platform || 'multi' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

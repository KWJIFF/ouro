import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'doc_writer',
  version: '0.2.0',
  name: 'Document Writer',
  description: 'Write any type of document: articles, reports, proposals, memos, letters, technical documentation, specifications, tutorials, READMEs, and long-form content. Handles structure, tone, audience, and formatting.',
  capabilities: [
    'document_writing', 'article_writing', 'report', 'proposal',
    'technical_writing', 'tutorial', 'memo', 'letter', 'specification',
    'long_form_content', 'editing', 'proofreading',
  ],
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'What to write about' },
      type: { type: 'string', description: 'article, report, proposal, memo, letter, tutorial, spec, readme, essay, story' },
      audience: { type: 'string', description: 'Who will read this' },
      tone: { type: 'string', description: 'formal, casual, technical, persuasive, narrative, academic' },
      length: { type: 'string', description: 'short (500w), medium (1500w), long (3000w+), custom word count' },
      outline: { type: 'array', items: { type: 'string' }, description: 'Custom section outline' },
      style_guide: { type: 'string', description: 'Style guide to follow (AP, Chicago, APA, custom)' },
      context: { type: 'string', description: 'Background information or source material' },
    },
    required: ['topic'],
  },
  output_schema: {
    type: 'object',
    properties: {
      document: { type: 'string' },
      word_count: { type: 'number' },
      sections: { type: 'array' },
    },
  },
  tags: ['writing', 'document', 'content', 'article'],
};

export const docWriterTool: OuroTool = {
  manifest,

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { topic, type, audience, tone, length, outline, style_guide, context } = input.parameters;
    const startTime = Date.now();

    const typeGuides: Record<string, string> = {
      article: 'Write an engaging article with a compelling hook, clear thesis, supporting evidence, and a strong conclusion. Include subheadings for readability.',
      report: 'Write a structured report with executive summary, methodology, findings, analysis, and recommendations. Use data-driven language.',
      proposal: 'Write a persuasive proposal with problem statement, proposed solution, implementation plan, budget considerations, and expected outcomes.',
      memo: 'Write a concise business memo with clear purpose, background, key points, and action items. Keep it under 1 page.',
      letter: 'Write a professional letter with proper salutation, clear body paragraphs, and appropriate closing.',
      tutorial: 'Write a step-by-step tutorial with prerequisites, numbered steps, code examples where relevant, common pitfalls, and verification steps.',
      spec: 'Write a technical specification with overview, requirements (functional and non-functional), architecture, API contracts, and acceptance criteria.',
      readme: 'Write a comprehensive README with project overview, features, installation, usage examples, configuration, API reference, contributing guidelines, and license.',
      essay: 'Write a thoughtful essay with a clear thesis, well-structured arguments, evidence, counterarguments, and a compelling conclusion.',
      story: 'Write a narrative with vivid characters, setting, conflict, rising action, climax, and resolution.',
    };

    const lengthGuide = length === 'short' ? 'Keep it concise, around 500 words.' :
                        length === 'long' ? 'Be comprehensive, 3000+ words.' :
                        length?.match(/\d+/) ? `Target approximately ${length} words.` :
                        'Aim for 1000-1500 words (medium length).';

    const systemPrompt = [
      `You are an expert writer. ${typeGuides[type || 'article'] || typeGuides.article}`,
      `Audience: ${audience || 'general professional audience'}`,
      `Tone: ${tone || 'professional, clear, and engaging'}`,
      lengthGuide,
      style_guide ? `Follow ${style_guide} style guide.` : '',
      outline?.length ? `Follow this outline:\n${outline.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}` : '',
      context ? `Background context:\n${context}` : '',
      'Format in clean markdown. Do NOT include word count or meta-commentary in the output.',
    ].filter(Boolean).join('\n\n');

    const response = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Write about: ${topic}` },
    ], {
      temperature: type === 'story' || type === 'essay' ? 0.8 : type === 'spec' ? 0.3 : 0.6,
      max_tokens: length === 'long' ? 8192 : length === 'short' ? 2048 : 4096,
    });

    const wordCount = response.content.split(/\s+/).length;

    return {
      success: true,
      artifacts: [{
        type: 'text',
        content: response.content,
        metadata: {
          type: 'document',
          format: 'markdown',
          subtype: type || 'article',
          word_count: wordCount,
          audience: audience || 'general',
          tone: tone || 'professional',
        },
      }],
      metrics: {
        duration_ms: Date.now() - startTime,
        tokens_used: response.tokens_used.input + response.tokens_used.output,
      },
    };
  },
};

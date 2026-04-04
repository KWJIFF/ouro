import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'doc_writer',
  version: '0.2.0',
  name: 'Document Writer',
  description: 'Write professional documents: articles, reports, proposals, memos, meeting notes, technical specs, user stories, PRDs, design docs, incident reports, and any other structured writing. Adapts tone, structure, and depth to audience and purpose.',
  capabilities: [
    'document_writing', 'article_writing', 'report_writing', 'proposal_writing',
    'memo_writing', 'technical_spec', 'user_story', 'prd', 'design_doc',
    'incident_report', 'meeting_notes', 'creative_writing',
  ],
  input_schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'What to write' },
      type: { type: 'string', description: 'Document type: article, report, proposal, memo, spec, prd, design_doc, incident_report, meeting_notes, essay, story' },
      tone: { type: 'string', description: 'Writing tone: professional, academic, casual, technical, persuasive, narrative' },
      audience: { type: 'string', description: 'Target audience' },
      length: { type: 'string', description: 'short (500w), medium (1500w), long (3000w+)' },
      structure: { type: 'string', description: 'Custom structure/outline (optional)' },
      references: { type: 'array', items: { type: 'string' }, description: 'Sources or context to incorporate' },
    },
    required: ['prompt'],
  },
  output_schema: {
    type: 'object',
    properties: { document: { type: 'string' }, metadata: { type: 'object' } },
  },
  tags: ['writing', 'document', 'content'],
};

export const docWriterTool: OuroTool = {
  manifest,

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { prompt, type, tone, audience, length, structure, references } = input.parameters;
    const startTime = Date.now();

    const docTemplates: Record<string, string> = {
      article: `Write a well-structured article with: engaging introduction, clear thesis, supporting sections with evidence, and a compelling conclusion. Include subheadings for readability.`,
      report: `Write a formal report with: executive summary, background, methodology (if applicable), findings, analysis, conclusions, and recommendations. Use data-driven language.`,
      proposal: `Write a persuasive proposal with: problem statement, proposed solution, approach/methodology, timeline, budget considerations, expected outcomes, and call to action.`,
      memo: `Write a concise business memo with: header (To/From/Date/Re), purpose statement, key points, and action items. Keep it under 1 page.`,
      spec: `Write a technical specification with: overview, requirements (functional and non-functional), constraints, architecture decisions, API contracts, data models, and success criteria.`,
      prd: `Write a product requirements document with: problem statement, user personas, user stories, acceptance criteria, scope (in/out), dependencies, success metrics, and timeline.`,
      design_doc: `Write a design document with: context, problem statement, proposed design, alternatives considered, trade-offs, implementation plan, testing strategy, and rollback plan.`,
      incident_report: `Write an incident report with: summary, timeline of events, impact assessment, root cause analysis, resolution steps taken, lessons learned, and action items to prevent recurrence.`,
      meeting_notes: `Write structured meeting notes with: date/attendees, agenda items discussed, key decisions made, action items (who/what/when), and next meeting date/topics.`,
      essay: `Write a thoughtful essay with: compelling opening, clear argument development, supporting evidence, counterargument acknowledgment, and a memorable conclusion.`,
      story: `Write an engaging narrative with: setting establishment, character introduction, conflict development, rising tension, climax, and resolution. Show don't tell.`,
    };

    const template = docTemplates[type || 'article'] || docTemplates.article;
    const wordTarget = length === 'short' ? '500' : length === 'long' ? '3000+' : '1500';

    let systemContent = `You are an expert writer. ${template}
Tone: ${tone || 'professional'}
Audience: ${audience || 'general professional'}
Target length: ~${wordTarget} words.`;

    if (structure) {
      systemContent += `\n\nFollow this structure:\n${structure}`;
    }

    if (references?.length) {
      systemContent += `\n\nIncorporate context from:\n${references.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`;
    }

    systemContent += `\n\nOutput clean markdown. No meta-commentary about the writing itself.`;

    const response = await callAI([
      { role: 'system', content: systemContent },
      { role: 'user', content: prompt },
    ], {
      temperature: tone === 'creative' || type === 'story' ? 0.8 : 0.5,
      max_tokens: length === 'long' ? 8192 : length === 'short' ? 2048 : 4096,
    });

    return {
      success: true,
      artifacts: [{
        type: 'text',
        content: response.content,
        metadata: {
          type: 'document',
          format: 'markdown',
          doc_type: type || 'article',
          tone: tone || 'professional',
          word_count: response.content.split(/\s+/).length,
        },
      }],
      metrics: {
        duration_ms: Date.now() - startTime,
        tokens_used: response.tokens_used.input + response.tokens_used.output,
      },
    };
  },
};

import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'interview_prep',
  version: '0.1.0',
  name: 'Interview Preparation',
  description: 'Generate interview preparation materials: common questions with model answers, behavioral STAR examples, technical questions, company research prompts, and practice scenarios for any role or industry.',
  capabilities: ['interview_prep', 'career', 'behavioral_questions', 'technical_questions', 'practice'],
  input_schema: {
    type: 'object',
    properties: {
      role: { type: 'string', description: 'Role being interviewed for' },
      company: { type: 'string', description: 'Company name (for tailored prep)' },
      type: { type: 'string', description: 'Interview type: behavioral, technical, system_design, case_study, general' },
      experience_level: { type: 'string', description: 'junior, mid, senior, staff, principal, executive' },
      focus_areas: { type: 'array', items: { type: 'string' }, description: 'Specific topics to focus on' },
    },
    required: ['role'],
  },
  output_schema: { type: 'object', properties: { prep: { type: 'string' } } },
  tags: ['interview', 'career', 'preparation', 'questions'],
};

export const interviewPrepTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { role, company, type, experience_level, focus_areas } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `Create comprehensive interview preparation for a ${experience_level || 'mid-level'} ${role} position${company ? ` at ${company}` : ''}.
Type: ${type || 'general (mix of behavioral and technical)'}
${focus_areas?.length ? `Focus areas: ${focus_areas.join(', ')}` : ''}

Include:

## Role Overview
- Key responsibilities and expectations at this level
- What interviewers are really evaluating

## Common Questions (10-15)
For each question:
- The question
- Why they ask it (what they're evaluating)
- A strong answer framework
- Example answer (using STAR for behavioral)
- Common mistakes to avoid

## Technical Deep Dive (if applicable)
- 5 technical questions at appropriate difficulty
- Expected depth of answer for ${experience_level || 'mid'} level

## Questions to Ask Them
- 5 thoughtful questions that demonstrate genuine interest and strategic thinking

## Red Flags to Watch For
- Signs the role/company might not be a good fit

## Final Tips
- Day-of preparation checklist`,
      },
      { role: 'user', content: `Prepare me for a ${role} interview${company ? ` at ${company}` : ''}` },
    ], { temperature: 0.6, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'interview_prep', role, company } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'learning_plan',
  version: '0.1.0',
  name: 'Learning Plan Generator',
  description: 'Create structured learning plans for any topic or skill. Includes curriculum design, resource recommendations, milestones, practice exercises, and time estimates.',
  capabilities: ['learning', 'education', 'curriculum', 'skill_development', 'study_plan'],
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'What to learn' },
      current_level: { type: 'string', description: 'Current skill level: beginner, intermediate, advanced' },
      time_available: { type: 'string', description: 'Hours per week available' },
      goal: { type: 'string', description: 'Specific learning goal' },
      learning_style: { type: 'string', description: 'visual, auditory, hands-on, reading' },
    },
    required: ['topic'],
  },
  output_schema: { type: 'object', properties: { plan: { type: 'string' } } },
  tags: ['learning', 'education', 'skill', 'curriculum'],
};

export const learningPlanTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { topic, current_level, time_available, goal, learning_style } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `Create a comprehensive learning plan.
Level: ${current_level || 'beginner'}
Time: ${time_available || 'flexible'}
Style: ${learning_style || 'mixed'}
${goal ? `Goal: ${goal}` : ''}

Include:
1. Learning roadmap (phases with milestones)
2. Week-by-week curriculum
3. Resource recommendations (free + paid)
4. Practice exercises for each phase
5. Assessment checkpoints
6. Common pitfalls to avoid
7. Estimated total time to competency

Format in clean markdown.`,
      },
      { role: 'user', content: `Learning plan for: ${topic}` },
    ], { temperature: 0.6, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'markdown', subtype: 'learning_plan' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

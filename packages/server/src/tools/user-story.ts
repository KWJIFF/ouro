import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'user_story_writer',
  version: '0.1.0',
  name: 'User Story Writer',
  description: 'Generate user stories, acceptance criteria, and task breakdowns for agile development. Creates well-structured stories with INVEST principles and Definition of Done.',
  capabilities: ['user_story', 'agile', 'requirements', 'acceptance_criteria', 'task_breakdown'],
  input_schema: {
    type: 'object',
    properties: {
      feature: { type: 'string', description: 'Feature or epic description' },
      personas: { type: 'array', items: { type: 'string' } },
      format: { type: 'string', description: 'stories, epic, task_breakdown' },
      include_technical: { type: 'boolean' },
    },
    required: ['feature'],
  },
  output_schema: { type: 'object' },
  tags: ['agile', 'user_story', 'requirements', 'scrum', 'product'],
};

export const userStoryWriterTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { feature, personas, format, include_technical } = input.parameters;
    const startTime = Date.now();
    const response = await callAI([
      {
        role: 'system',
        content: `Generate user stories for an agile development team.
${personas?.length ? `User personas: ${personas.join(', ')}` : ''}
Format: ${format || 'stories'}
${include_technical ? 'Include technical implementation notes.' : ''}

For each story:
- **Title**: Brief descriptive title
- **Story**: As a [persona], I want [goal], so that [benefit]
- **Acceptance Criteria**: Given/When/Then format (3-5 criteria)
- **Story Points**: Estimate (1/2/3/5/8/13)
- **Priority**: Must/Should/Could/Won't
${include_technical ? '- **Technical Notes**: Implementation considerations' : ''}

Also provide:
- Epic summary
- Dependency mapping between stories
- Suggested sprint allocation`,
      },
      { role: 'user', content: feature },
    ], { temperature: 0.5, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'user_stories' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

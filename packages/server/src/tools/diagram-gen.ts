import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'diagram_generator',
  version: '0.1.0',
  name: 'Diagram Generator',
  description: 'Generate diagrams from text descriptions: flowcharts, sequence diagrams, entity-relationship diagrams, state machines, architecture diagrams, and more. Outputs Mermaid syntax and SVG.',
  capabilities: ['diagram', 'flowchart', 'sequence_diagram', 'er_diagram', 'architecture_diagram', 'state_machine'],
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'What to diagram' },
      type: { type: 'string', description: 'flowchart, sequence, er, state, class, architecture, gantt' },
      format: { type: 'string', description: 'mermaid, svg, both' },
    },
    required: ['description'],
  },
  output_schema: { type: 'object', properties: { mermaid: { type: 'string' }, svg: { type: 'string' } } },
  tags: ['diagram', 'visualization', 'flowchart', 'architecture'],
};

export const diagramGenTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { description, type, format } = input.parameters;
    const startTime = Date.now();

    const diagramType = type || 'flowchart';
    const response = await callAI([
      {
        role: 'system',
        content: `Generate a ${diagramType} diagram in Mermaid syntax.
Rules:
- Use proper Mermaid syntax
- Include meaningful labels on all nodes and edges
- Use subgraphs for logical grouping when helpful
- Keep it clean and readable

Also generate an SVG visualization of the same diagram.

Output format:
## Mermaid
\`\`\`mermaid
[mermaid code]
\`\`\`

## SVG
[SVG code]`,
      },
      { role: 'user', content: description },
    ], { temperature: 0.5, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'design', format: 'diagram', diagram_type: diagramType } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

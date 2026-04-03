import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'mind_map',
  version: '0.1.0',
  name: 'Mind Map Generator',
  description: 'Generate structured mind maps from topics or brainstorming sessions. Outputs hierarchical idea structures as both text and SVG visualization.',
  capabilities: ['mind_map', 'brainstorm', 'idea_structure', 'concept_map', 'hierarchy'],
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Central topic for the mind map' },
      depth: { type: 'number', description: 'Levels of branching (2-5, default 3)' },
      style: { type: 'string', description: 'analytical, creative, strategic, exploratory' },
      focus_areas: { type: 'array', items: { type: 'string' }, description: 'Specific branches to explore deeper' },
    },
    required: ['topic'],
  },
  output_schema: {
    type: 'object',
    properties: { map: { type: 'object' }, svg: { type: 'string' }, markdown: { type: 'string' } },
  },
  tags: ['mind_map', 'brainstorm', 'visualization', 'thinking'],
};

export const mindMapTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { topic, depth, style, focus_areas } = input.parameters;
    const startTime = Date.now();

    // Step 1: Generate mind map structure
    const structureResponse = await callAI([
      {
        role: 'system',
        content: `Generate a mind map as a hierarchical JSON structure.
Depth: ${depth || 3} levels
Style: ${style || 'balanced'}
${focus_areas ? `Focus areas: ${focus_areas.join(', ')}` : ''}

Output JSON only:
{
  "center": "topic",
  "branches": [
    {
      "label": "branch name",
      "children": [
        { "label": "sub-topic", "children": [...] }
      ]
    }
  ]
}

Each main branch should have 3-5 children. Go ${depth || 3} levels deep.`,
      },
      { role: 'user', content: topic },
    ], { temperature: 0.7, max_tokens: 4096 });

    let mapData: any;
    try {
      mapData = JSON.parse(structureResponse.content.replace(/```json|```/g, '').trim());
    } catch {
      mapData = { center: topic, branches: [], raw: structureResponse.content };
    }

    // Step 2: Generate markdown representation
    let markdown = `# Mind Map: ${topic}\n\n`;
    function renderBranch(node: any, indent: number = 0) {
      const prefix = indent === 0 ? '##' : '  '.repeat(indent) + '-';
      if (node.label) markdown += `${prefix} ${node.label}\n`;
      if (node.children) node.children.forEach((c: any) => renderBranch(c, indent + 1));
    }
    if (mapData.branches) {
      for (const branch of mapData.branches) renderBranch(branch);
    }

    // Step 3: Generate SVG visualization
    const svgResponse = await callAI([
      {
        role: 'system',
        content: `Generate an SVG mind map visualization.
Center node: "${topic}"
Branches: ${JSON.stringify(mapData.branches?.map((b: any) => b.label) || [])}

Create a clean, radial mind map SVG with:
- Center circle for the main topic
- Lines radiating outward to branch nodes
- Color-coded branches
- viewBox="0 0 1000 700"
- Clean sans-serif font
- Output ONLY the <svg>...</svg> code`,
      },
      { role: 'user', content: `Mind map for: ${topic}` },
    ], { temperature: 0.7, max_tokens: 4096 });

    const totalTokens = (structureResponse.tokens_used.input + structureResponse.tokens_used.output)
      + (svgResponse.tokens_used.input + svgResponse.tokens_used.output);

    return {
      success: true,
      artifacts: [
        { type: 'text', content: markdown, metadata: { type: 'document', format: 'markdown', subtype: 'mind_map', structured_data: mapData } },
        { type: 'text', content: svgResponse.content, metadata: { type: 'image', format: 'svg', subtype: 'mind_map' } },
      ],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: totalTokens },
    };
  },
};

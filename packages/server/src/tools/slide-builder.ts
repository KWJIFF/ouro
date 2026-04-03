import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'slide_builder',
  version: '0.1.0',
  name: 'Slide Builder',
  description: 'Create presentation slide decks with structured content, speaker notes, and visual layout suggestions. Generates complete presentation outlines with per-slide content.',
  capabilities: ['presentation', 'slides', 'deck', 'pitch', 'keynote'],
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Presentation topic or title' },
      audience: { type: 'string', description: 'Target audience' },
      slides: { type: 'number', description: 'Number of slides (default: 10)' },
      style: { type: 'string', description: 'Presentation style: formal, casual, pitch, educational' },
      include_notes: { type: 'boolean', description: 'Include speaker notes' },
    },
    required: ['topic'],
  },
  output_schema: {
    type: 'object',
    properties: {
      slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slide_number: { type: 'number' },
            title: { type: 'string' },
            content: { type: 'string' },
            speaker_notes: { type: 'string' },
            layout: { type: 'string' },
            visual_suggestion: { type: 'string' },
          },
        },
      },
    },
  },
  tags: ['presentation', 'slides', 'communication'],
};

export const slideBuilderTool: OuroTool = {
  manifest,

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { topic, audience, slides, style, include_notes } = input.parameters;
    const numSlides = slides || 10;
    const startTime = Date.now();

    const systemPrompt = `You are a presentation designer creating a ${numSlides}-slide deck.
Topic: ${topic}
Audience: ${audience || 'general professional audience'}
Style: ${style || 'professional'}
${include_notes !== false ? 'Include detailed speaker notes for each slide.' : ''}

Generate a complete presentation in JSON format:
{
  "title": "Deck title",
  "slides": [
    {
      "slide_number": 1,
      "title": "Slide title",
      "content": "Main bullet points and content (use markdown)",
      "speaker_notes": "What to say when presenting this slide",
      "layout": "title_slide|content|two_column|image_focus|quote|data_chart|comparison|closing",
      "visual_suggestion": "Describe what visual/graphic would work here"
    }
  ]
}

Rules:
- First slide is always a title slide
- Last slide is always a closing/CTA slide
- Each slide should have 3-5 bullet points maximum
- Speaker notes should be 2-3 sentences of natural speaking guidance
- Visual suggestions should be specific and actionable`;

    const response = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create the presentation about: ${topic}` },
    ], { temperature: 0.6, max_tokens: 8192 });

    let presentationData: any;
    try {
      const clean = response.content.replace(/```json|```/g, '').trim();
      presentationData = JSON.parse(clean);
    } catch {
      presentationData = { title: topic, raw_content: response.content };
    }

    // Also generate a markdown version for easy viewing
    let markdown = `# ${presentationData.title || topic}\n\n`;
    if (presentationData.slides) {
      for (const slide of presentationData.slides) {
        markdown += `---\n\n## Slide ${slide.slide_number}: ${slide.title}\n\n`;
        markdown += `${slide.content}\n\n`;
        if (slide.speaker_notes) {
          markdown += `> **Speaker Notes:** ${slide.speaker_notes}\n\n`;
        }
        if (slide.visual_suggestion) {
          markdown += `*Visual: ${slide.visual_suggestion}*\n\n`;
        }
      }
    }

    return {
      success: true,
      artifacts: [
        {
          type: 'text',
          content: markdown,
          metadata: {
            type: 'document',
            format: 'markdown',
            subtype: 'presentation',
            slide_count: presentationData.slides?.length || numSlides,
            structured_data: presentationData,
          },
        },
      ],
      metrics: {
        duration_ms: Date.now() - startTime,
        tokens_used: response.tokens_used.input + response.tokens_used.output,
      },
    };
  },
};

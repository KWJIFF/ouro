import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'meeting_notes',
  version: '0.1.0',
  name: 'Meeting Notes Processor',
  description: 'Transform meeting transcripts, voice memos, and rough notes into structured meeting notes with action items, decisions, key discussion points, and follow-ups. Supports various meeting formats.',
  capabilities: ['meeting_notes', 'transcript_processing', 'action_items', 'minutes'],
  input_schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Meeting transcript, recording text, or rough notes' },
      format: { type: 'string', description: 'Output format: standard, executive, action_only, cornell' },
      meeting_type: { type: 'string', description: 'standup, planning, review, brainstorm, client, all_hands' },
      attendees: { type: 'array', items: { type: 'string' }, description: 'List of attendees' },
    },
    required: ['content'],
  },
  output_schema: { type: 'object', properties: { notes: { type: 'string' }, action_items: { type: 'array' }, decisions: { type: 'array' } } },
  tags: ['meeting', 'notes', 'transcript', 'action_items', 'productivity'],
};

export const meetingNotesTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { content, format, meeting_type, attendees } = input.parameters;
    const startTime = Date.now();

    const formatGuides: Record<string, string> = {
      standard: `Produce structured meeting notes:
## Meeting Summary
(2-3 sentence overview)

## Key Discussion Points
(Organized by topic, with speaker attribution where possible)

## Decisions Made
(Numbered list with rationale)

## Action Items
(Each with: description, owner, deadline)

## Open Questions
(Items needing follow-up)

## Next Steps
(What happens after this meeting)`,

      executive: `Produce an executive brief:
- Bottom line (1 sentence)
- 3-5 key decisions
- Critical action items (with owners)
- Risks or blockers identified
Keep it under 300 words.`,

      action_only: `Extract ONLY action items. Format each as:
- [ ] [Description] — Owner: [name] | Due: [date/timeframe] | Priority: [high/medium/low]`,

      cornell: `Use Cornell Notes format:
| Cue/Questions | Notes |
|---|---|
| [key questions] | [detailed notes] |

Summary: [2-3 sentence summary at bottom]`,
    };

    const response = await callAI([
      {
        role: 'system',
        content: `You are a professional meeting note-taker.
Meeting type: ${meeting_type || 'general'}
${attendees?.length ? `Attendees: ${attendees.join(', ')}` : ''}

${formatGuides[format || 'standard'] || formatGuides.standard}

Be thorough but concise. Capture decisions and commitments precisely. Attribute action items to specific people where identifiable.`,
      },
      { role: 'user', content: content.slice(0, 30000) },
    ], { temperature: 0.3, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'meeting_notes', meeting_type: meeting_type || 'general' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

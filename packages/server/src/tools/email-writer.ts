import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'email_writer',
  version: '0.1.0',
  name: 'Email Writer',
  description: 'Compose professional emails, newsletters, cold outreach, follow-ups, and any email communication. Handles tone, structure, and call-to-action optimization.',
  capabilities: ['email', 'communication', 'outreach', 'newsletter', 'writing'],
  input_schema: {
    type: 'object',
    properties: {
      purpose: { type: 'string', description: 'What this email should accomplish' },
      recipient: { type: 'string', description: 'Who is receiving this email' },
      tone: { type: 'string', description: 'Tone: formal, casual, friendly, urgent, persuasive' },
      context: { type: 'string', description: 'Background context or previous conversation' },
      length: { type: 'string', description: 'short, medium, long' },
    },
    required: ['purpose'],
  },
  output_schema: {
    type: 'object',
    properties: { subject: { type: 'string' }, body: { type: 'string' }, notes: { type: 'string' } },
  },
  tags: ['email', 'communication', 'writing'],
};

export const emailWriterTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { purpose, recipient, tone, context, length } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are an expert email writer. Write an email that achieves the stated purpose.
Tone: ${tone || 'professional'}
Length: ${length || 'medium'}
${recipient ? `Recipient: ${recipient}` : ''}
${context ? `Context: ${context}` : ''}

Output format:
Subject: [subject line]

[email body]

---
Notes: [any strategic notes about timing, follow-up, etc.]`,
      },
      { role: 'user', content: purpose },
    ], { temperature: 0.7, max_tokens: 2048 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'email' } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

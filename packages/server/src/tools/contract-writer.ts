import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'contract_writer',
  version: '0.1.0',
  name: 'Contract & Legal Document Writer',
  description: 'Draft contracts, terms of service, privacy policies, NDAs, freelance agreements, and other legal documents. Generates professional templates with customizable clauses. Note: not a substitute for legal counsel.',
  capabilities: ['contract', 'legal_document', 'terms_of_service', 'privacy_policy', 'nda', 'agreement'],
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Document type: nda, freelance_agreement, tos, privacy_policy, partnership, employment, saas_agreement, consulting' },
      parties: { type: 'array', items: { type: 'string' }, description: 'Parties involved' },
      key_terms: { type: 'string', description: 'Key terms and conditions to include' },
      jurisdiction: { type: 'string', description: 'Governing jurisdiction' },
      duration: { type: 'string', description: 'Agreement duration' },
    },
    required: ['type'],
  },
  output_schema: { type: 'object', properties: { document: { type: 'string' } } },
  tags: ['legal', 'contract', 'agreement', 'policy', 'terms'],
};

export const contractWriterTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { type, parties, key_terms, jurisdiction, duration } = input.parameters;
    const startTime = Date.now();

    const typeNames: Record<string, string> = {
      nda: 'Non-Disclosure Agreement (NDA)',
      freelance_agreement: 'Freelance Service Agreement',
      tos: 'Terms of Service',
      privacy_policy: 'Privacy Policy',
      partnership: 'Partnership Agreement',
      employment: 'Employment Agreement',
      saas_agreement: 'SaaS Service Agreement',
      consulting: 'Consulting Agreement',
    };

    const response = await callAI([
      {
        role: 'system',
        content: `Draft a professional ${typeNames[type] || type}.
${parties?.length ? `Parties: ${parties.join(' and ')}` : ''}
${key_terms ? `Key terms: ${key_terms}` : ''}
${jurisdiction ? `Jurisdiction: ${jurisdiction}` : 'Jurisdiction: [TO BE SPECIFIED]'}
${duration ? `Duration: ${duration}` : ''}

Requirements:
1. Use formal legal language but keep it readable
2. Include standard clauses for this document type
3. Mark customizable sections with [BRACKETS]
4. Include signature blocks
5. Add a disclaimer: "This is a template and does not constitute legal advice. Consult a qualified attorney."

Structure with numbered sections and clear headings.`,
      },
      { role: 'user', content: `Generate a ${typeNames[type] || type}${key_terms ? ` with focus on: ${key_terms}` : ''}` },
    ], { temperature: 0.3, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'legal', subtype: type } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

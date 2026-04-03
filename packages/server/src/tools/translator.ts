import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'translator',
  version: '0.1.0',
  name: 'Universal Translator',
  description: 'Translate text between any languages with context-aware accuracy. Handles technical terminology, idioms, cultural nuance, and register adaptation.',
  capabilities: ['translation', 'language', 'localization', 'i18n'],
  input_schema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to translate' },
      source_lang: { type: 'string', description: 'Source language (auto-detect if empty)' },
      target_lang: { type: 'string', description: 'Target language' },
      context: { type: 'string', description: 'Domain context for better accuracy' },
      register: { type: 'string', description: 'formal, casual, technical, literary' },
    },
    required: ['text', 'target_lang'],
  },
  output_schema: {
    type: 'object',
    properties: {
      translation: { type: 'string' },
      detected_source: { type: 'string' },
      notes: { type: 'string' },
    },
  },
  tags: ['translation', 'language', 'i18n'],
};

export const translatorTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { text, source_lang, target_lang, context, register } = input.parameters;
    const startTime = Date.now();

    const response = await callAI([
      {
        role: 'system',
        content: `You are a professional translator.
Target language: ${target_lang}
${source_lang ? `Source language: ${source_lang}` : 'Auto-detect source language.'}
${context ? `Domain context: ${context}` : ''}
Register: ${register || 'natural, matching the original'}

Provide:
1. The translation
2. Source language detected (if auto)
3. Any translation notes (cultural adaptations, ambiguities resolved, etc.)

Format:
[Translation]

---
Source: [detected language]
Notes: [translation notes]`,
      },
      { role: 'user', content: text },
    ], { temperature: 0.3, max_tokens: 4096 });

    return {
      success: true,
      artifacts: [{ type: 'text', content: response.content, metadata: { type: 'document', format: 'translation', target_lang } }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

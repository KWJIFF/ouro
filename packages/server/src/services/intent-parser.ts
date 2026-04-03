import { generateId } from '@ouro/core';
import type { CapturedSignal, ParsedIntent, IntentType } from '@ouro/core';
import { callAI } from '../ai/llm-client';
import { INTENT_PARSE_SYSTEM, buildIntentParsePrompt } from '../ai/prompts/intent-parse';
import { query, getOne } from '../db/client';
import { config } from '../config';
import { getRecentSignals } from './signal-capture';

export async function parseIntent(signal: CapturedSignal): Promise<ParsedIntent> {
  const recentSignals = await getRecentSignals(5);
  const recentTexts = recentSignals
    .filter(s => s.id !== signal.id)
    .map(s => s.normalized_text)
    .slice(0, 4);

  const personalModel = await getPersonalModel();

  const userPrompt = buildIntentParsePrompt(
    signal.normalized_text,
    signal.modality,
    recentTexts,
    personalModel,
  );

  const response = await callAI([
    { role: 'system', content: INTENT_PARSE_SYSTEM },
    { role: 'user', content: userPrompt },
  ], { temperature: 0.3 });

  let parsed: any;
  try {
    const clean = response.content.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    // If AI response isn't valid JSON, default to capture intent
    parsed = {
      intent_type: 'capture',
      confidence: 0.5,
      description: signal.normalized_text,
      parameters: {},
      needs_clarification: false,
    };
  }

  const intent: ParsedIntent = {
    id: generateId(),
    signal_id: signal.id,
    intent_type: parsed.intent_type as IntentType,
    confidence: parsed.confidence,
    description: parsed.description,
    parameters: parsed.parameters || {},
    needs_clarification: parsed.needs_clarification && parsed.confidence < config.evolution.intentConfidenceThreshold,
    clarification_question: parsed.clarification_question,
  };

  await query(
    `INSERT INTO intents (id, signal_id, created_at, intent_type, confidence, description, parameters, clarification_asked)
     VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7)`,
    [intent.id, intent.signal_id, intent.intent_type, intent.confidence, intent.description, JSON.stringify(intent.parameters), intent.needs_clarification]
  );

  return intent;
}

async function getPersonalModel(): Promise<Record<string, any>> {
  const row = await getOne<{ value: any }>('SELECT value FROM system_state WHERE key = $1', ['personal_model']);
  return row?.value || {};
}

import { generateId, now } from '@ouro/core';
import { query, getOne, getMany } from '../db/client';
import { callAI } from '../ai/llm-client';
import { INTENT_PARSE_SYSTEM } from '../ai/prompts/intent-parse';
import { PLAN_GENERATE_SYSTEM } from '../ai/prompts/plan-generate';

/**
 * Prompt Version Manager
 * 
 * This is the mechanism by which the evolution engine ACTUALLY rewrites prompts.
 * Each prompt has a version history. The evolution engine generates new versions,
 * tests them against historical data, and promotes winners.
 * 
 * This closes the loop: signal → pattern → evolution → prompt change → better signal processing
 */

interface PromptVersion {
  id: string;
  prompt_key: string;       // 'intent_parse' | 'plan_generate' | tool-specific
  version: number;
  content: string;
  created_at: string;
  is_active: boolean;
  performance: {
    tested_signals: number;
    accuracy: number;        // For intent parsing
    satisfaction: number;    // For execution planning
    avg_tokens: number;
  } | null;
  parent_version: string | null;
  change_reason: string;
}

// In-memory prompt store (backed by system_state)
const activePrompts: Record<string, string> = {
  intent_parse: INTENT_PARSE_SYSTEM,
  plan_generate: PLAN_GENERATE_SYSTEM,
};

const promptHistory: PromptVersion[] = [];

export function getActivePrompt(key: string): string {
  return activePrompts[key] || '';
}

export function setActivePrompt(key: string, content: string): void {
  activePrompts[key] = content;
}

export async function generatePromptImprovement(
  promptKey: string,
  failureExamples: Array<{ input: string; expected: string; actual: string }>,
): Promise<PromptVersion | null> {
  const currentPrompt = activePrompts[promptKey];
  if (!currentPrompt) return null;

  const examplesText = failureExamples.slice(0, 5).map((ex, i) =>
    `Example ${i + 1}:\n  Input: ${ex.input.slice(0, 200)}\n  Expected: ${ex.expected}\n  Got: ${ex.actual}`
  ).join('\n\n');

  try {
    const response = await callAI([
      {
        role: 'system',
        content: `You are a prompt engineer optimizing AI system prompts.
You will receive:
1. The current prompt
2. Examples where it failed

Your job: Produce an IMPROVED version of the prompt that would handle these failure cases correctly while maintaining all existing capabilities.

Output ONLY the new prompt text. No explanations, no markdown fences.`,
      },
      {
        role: 'user',
        content: `Current prompt:\n---\n${currentPrompt}\n---\n\nFailure examples:\n${examplesText}\n\nGenerate the improved prompt:`,
      },
    ], { temperature: 0.4, max_tokens: 4096 });

    const newVersion: PromptVersion = {
      id: generateId(),
      prompt_key: promptKey,
      version: promptHistory.filter(p => p.prompt_key === promptKey).length + 2,
      content: response.content,
      created_at: now(),
      is_active: false, // Not active until validated
      performance: null,
      parent_version: promptHistory.find(p => p.prompt_key === promptKey && p.is_active)?.id || null,
      change_reason: `Addressing ${failureExamples.length} failure cases`,
    };

    promptHistory.push(newVersion);
    return newVersion;
  } catch {
    return null;
  }
}

export async function validatePromptVersion(
  version: PromptVersion,
  testCases: Array<{ input: string; expected_type?: string }>,
): Promise<{ accuracy: number; avgTokens: number }> {
  let correct = 0;
  let totalTokens = 0;

  for (const test of testCases.slice(0, 10)) {
    try {
      const response = await callAI([
        { role: 'system', content: version.content },
        { role: 'user', content: test.input },
      ], { temperature: 0.3, max_tokens: 1024 });

      totalTokens += response.tokens_used.input + response.tokens_used.output;

      if (test.expected_type) {
        try {
          const parsed = JSON.parse(response.content.replace(/```json|```/g, '').trim());
          if (parsed.intent_type === test.expected_type) correct++;
        } catch { /* parse failed = incorrect */ }
      } else {
        correct++; // No expected = count as success if no error
      }
    } catch { /* API error = skip */ }
  }

  const accuracy = testCases.length > 0 ? correct / testCases.length : 0;
  const avgTokens = testCases.length > 0 ? totalTokens / testCases.length : 0;

  version.performance = { tested_signals: testCases.length, accuracy, satisfaction: accuracy, avg_tokens: avgTokens };
  return { accuracy, avgTokens };
}

export async function promotePromptVersion(version: PromptVersion): Promise<void> {
  // Deactivate current
  for (const p of promptHistory) {
    if (p.prompt_key === version.prompt_key) p.is_active = false;
  }
  // Activate new
  version.is_active = true;
  activePrompts[version.prompt_key] = version.content;

  // Persist
  const currentVersion = await getOne<any>(
    "SELECT value FROM system_state WHERE key = 'prompt_templates_version'"
  );
  const vNum = parseInt(currentVersion?.value?.replace(/"/g, '')?.replace('v', '') || '1') + 1;
  await query(
    "UPDATE system_state SET value = $1::jsonb, updated_at = NOW() WHERE key = 'prompt_templates_version'",
    [JSON.stringify(`v${vNum}`)]
  );
}

export function getPromptHistory(key?: string): PromptVersion[] {
  if (key) return promptHistory.filter(p => p.prompt_key === key);
  return [...promptHistory];
}

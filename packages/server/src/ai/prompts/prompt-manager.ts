import { query, getOne, getMany } from '../../db/client';
import { generateId, now } from '@ouro/core';

/**
 * Prompt Manager — Version-controlled prompt templates.
 * 
 * The evolution engine can create new prompt versions.
 * Each version is tested against historical data before deployment.
 * Rollback is always available.
 * 
 * This is the mechanism through which the meme rewrites its own cognitive patterns.
 */

export interface PromptTemplate {
  id: string;
  name: string;           // 'intent_parse' | 'plan_generate' | 'tool_select' | etc.
  version: number;
  content: string;         // The actual prompt text
  variables: string[];     // Template variables like {signal_text}, {modality}, etc.
  is_active: boolean;
  metrics: {
    accuracy?: number;      // Measured accuracy on test signals
    avg_latency_ms?: number;
    usage_count: number;
    created_at: string;
  };
}

// In-memory cache of active prompts
const activePrompts: Map<string, PromptTemplate> = new Map();

export async function initPromptManager(): Promise<void> {
  // Ensure prompt_templates table exists
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS prompt_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version INT NOT NULL,
        content TEXT NOT NULL,
        variables TEXT[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT FALSE,
        metrics JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(name, version)
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompt_templates(name)');
    await query('CREATE INDEX IF NOT EXISTS idx_prompts_active ON prompt_templates(is_active) WHERE is_active = TRUE');
  } catch { /* table might already exist */ }

  // Seed default prompts if none exist
  const count = await getOne<any>('SELECT COUNT(*) as c FROM prompt_templates');
  if (parseInt(count?.c || '0') === 0) {
    await seedDefaultPrompts();
  }

  // Load active prompts into cache
  await reloadActivePrompts();
}

export async function getActivePrompt(name: string): Promise<string> {
  const cached = activePrompts.get(name);
  if (cached) return cached.content;

  // Fallback to DB
  const row = await getOne<PromptTemplate>(
    'SELECT * FROM prompt_templates WHERE name = $1 AND is_active = TRUE ORDER BY version DESC LIMIT 1',
    [name]
  );
  if (row) {
    activePrompts.set(name, row);
    return row.content;
  }

  // Return built-in default
  return getDefaultPrompt(name);
}

export async function createPromptVersion(
  name: string,
  content: string,
  variables: string[] = [],
): Promise<PromptTemplate> {
  // Get current max version
  const current = await getOne<any>(
    'SELECT MAX(version) as v FROM prompt_templates WHERE name = $1',
    [name]
  );
  const nextVersion = (parseInt(current?.v || '0')) + 1;

  const template: PromptTemplate = {
    id: generateId(),
    name,
    version: nextVersion,
    content,
    variables,
    is_active: false,
    metrics: { usage_count: 0, created_at: now() },
  };

  await query(
    `INSERT INTO prompt_templates (id, name, version, content, variables, is_active, metrics)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [template.id, template.name, template.version, template.content,
     template.variables, false, JSON.stringify(template.metrics)]
  );

  return template;
}

export async function activatePromptVersion(name: string, version: number): Promise<void> {
  // Deactivate all versions of this prompt
  await query('UPDATE prompt_templates SET is_active = FALSE WHERE name = $1', [name]);
  // Activate specified version
  await query(
    'UPDATE prompt_templates SET is_active = TRUE WHERE name = $1 AND version = $2',
    [name, version]
  );
  // Reload cache
  await reloadActivePrompts();
}

export async function rollbackPrompt(name: string): Promise<number> {
  // Get current active version
  const current = await getOne<PromptTemplate>(
    'SELECT * FROM prompt_templates WHERE name = $1 AND is_active = TRUE',
    [name]
  );
  if (!current || current.version <= 1) return current?.version || 1;

  // Activate previous version
  const prevVersion = current.version - 1;
  await activatePromptVersion(name, prevVersion);
  return prevVersion;
}

export async function getPromptHistory(name: string): Promise<PromptTemplate[]> {
  return getMany<PromptTemplate>(
    'SELECT * FROM prompt_templates WHERE name = $1 ORDER BY version DESC',
    [name]
  );
}

export function renderPrompt(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return rendered;
}

async function reloadActivePrompts(): Promise<void> {
  const rows = await getMany<PromptTemplate>(
    'SELECT * FROM prompt_templates WHERE is_active = TRUE'
  );
  activePrompts.clear();
  for (const row of rows) {
    activePrompts.set(row.name, row);
  }
}

function getDefaultPrompt(name: string): string {
  const defaults: Record<string, string> = {
    intent_parse: `You are the intent parser for Ouro.
Given a human signal, determine what they want.
Intent types: CREATE, MODIFY, EXPLORE, CAPTURE, CONNECT, COMPOSE.
Signal: {signal_text}
Modality: {modality}
Respond with JSON only.`,

    plan_generate: `You are the execution planner for Ouro.
Given an intent, generate an execution plan as a DAG.
Available tools: {tool_list}
Intent: {intent_description}
Parameters: {parameters}
Respond with JSON only.`,

    tool_select: `Select the best tool for this task.
Available: {tool_list}
Task: {task_description}
Respond with tool ID only.`,

    signal_analyze: `Analyze this signal for patterns.
Signal: {signal_text}
Context: {context}
Extract creativity triggers, domain preferences, and expression habits.`,

    evolution_analyze: `Analyze these patterns and suggest improvements.
Patterns: {patterns}
Current accuracy: {accuracy}
Suggest one specific improvement.`,
  };

  return defaults[name] || defaults.intent_parse;
}

async function seedDefaultPrompts(): Promise<void> {
  const defaults = [
    { name: 'intent_parse', variables: ['signal_text', 'modality', 'recent_signals', 'personal_model'] },
    { name: 'plan_generate', variables: ['intent_description', 'parameters', 'tool_list', 'cached_paths'] },
    { name: 'tool_select', variables: ['task_description', 'tool_list'] },
    { name: 'signal_analyze', variables: ['signal_text', 'context'] },
    { name: 'evolution_analyze', variables: ['patterns', 'accuracy'] },
  ];

  for (const d of defaults) {
    const content = getDefaultPrompt(d.name);
    const id = generateId();
    await query(
      `INSERT INTO prompt_templates (id, name, version, content, variables, is_active, metrics)
       VALUES ($1, $2, 1, $3, $4, TRUE, $5)
       ON CONFLICT DO NOTHING`,
      [id, d.name, content, d.variables, JSON.stringify({ usage_count: 0, created_at: now() })]
    );
  }
}

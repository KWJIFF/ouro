import { query, getOne, getMany } from '../db/client';
import { generateId, now } from '@ouro/core';

/**
 * Dynamic Configuration Manager
 * 
 * Allows runtime configuration changes without restart.
 * The evolution engine uses this to adjust system behavior.
 * All changes are versioned and auditable.
 */

export interface ConfigEntry {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  category: string;
  modified_by: 'system' | 'user' | 'evolution';
  updated_at: string;
  version: number;
}

export interface ConfigChangeLog {
  id: string;
  key: string;
  old_value: any;
  new_value: any;
  changed_by: string;
  reason: string;
  timestamp: string;
}

// In-memory config cache
const configCache: Map<string, ConfigEntry> = new Map();

export async function initConfigManager(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ouro_config (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        type TEXT NOT NULL DEFAULT 'string',
        description TEXT DEFAULT '',
        category TEXT DEFAULT 'general',
        modified_by TEXT DEFAULT 'system',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        version INT DEFAULT 1
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS config_changelog (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        old_value JSONB,
        new_value JSONB NOT NULL,
        changed_by TEXT NOT NULL,
        reason TEXT DEFAULT '',
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch { /* tables might exist */ }

  // Seed defaults
  await seedDefaults();
  // Load into cache
  await reloadCache();
}

export async function getConfig<T = any>(key: string, defaultValue?: T): Promise<T> {
  const cached = configCache.get(key);
  if (cached) return cached.value as T;

  const row = await getOne<any>('SELECT value FROM ouro_config WHERE key = $1', [key]);
  if (row) return row.value as T;

  return defaultValue as T;
}

export async function setConfig(
  key: string,
  value: any,
  changedBy: string = 'user',
  reason: string = '',
): Promise<void> {
  const existing = await getOne<any>('SELECT value, version FROM ouro_config WHERE key = $1', [key]);

  // Log the change
  await query(
    `INSERT INTO config_changelog (id, key, old_value, new_value, changed_by, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [generateId(), key, existing ? JSON.stringify(existing.value) : null,
     JSON.stringify(value), changedBy, reason]
  );

  // Upsert config
  await query(
    `INSERT INTO ouro_config (key, value, modified_by, updated_at, version)
     VALUES ($1, $2, $3, NOW(), 1)
     ON CONFLICT (key) DO UPDATE SET
       value = $2, modified_by = $3, updated_at = NOW(), version = ouro_config.version + 1`,
    [key, JSON.stringify(value), changedBy]
  );

  // Update cache
  const entry = await getOne<any>('SELECT * FROM ouro_config WHERE key = $1', [key]);
  if (entry) configCache.set(key, entry);
}

export async function getAllConfig(category?: string): Promise<ConfigEntry[]> {
  if (category) {
    return getMany<ConfigEntry>('SELECT * FROM ouro_config WHERE category = $1 ORDER BY key', [category]);
  }
  return getMany<ConfigEntry>('SELECT * FROM ouro_config ORDER BY category, key');
}

export async function getConfigChangelog(key?: string, limit: number = 50): Promise<ConfigChangeLog[]> {
  if (key) {
    return getMany<ConfigChangeLog>(
      'SELECT * FROM config_changelog WHERE key = $1 ORDER BY timestamp DESC LIMIT $2',
      [key, limit]
    );
  }
  return getMany<ConfigChangeLog>(
    'SELECT * FROM config_changelog ORDER BY timestamp DESC LIMIT $1',
    [limit]
  );
}

async function reloadCache(): Promise<void> {
  const rows = await getMany<ConfigEntry>('SELECT * FROM ouro_config');
  configCache.clear();
  for (const row of rows) configCache.set(row.key, row);
}

async function seedDefaults(): Promise<void> {
  const defaults: Array<{ key: string; value: any; type: string; description: string; category: string }> = [
    // Signal capture
    { key: 'signal.max_text_length', value: 100000, type: 'number', description: 'Maximum text signal length in characters', category: 'signal' },
    { key: 'signal.max_file_size_mb', value: 500, type: 'number', description: 'Maximum file upload size in MB', category: 'signal' },
    { key: 'signal.offline_queue_max', value: 1000, type: 'number', description: 'Maximum offline queue size', category: 'signal' },
    { key: 'signal.auto_language_detect', value: true, type: 'boolean', description: 'Auto-detect signal language', category: 'signal' },

    // Intent parsing
    { key: 'intent.confidence_threshold', value: 0.7, type: 'number', description: 'Below this, ask for clarification', category: 'intent' },
    { key: 'intent.max_clarification_questions', value: 1, type: 'number', description: 'Maximum clarification questions per signal', category: 'intent' },
    { key: 'intent.context_window_size', value: 5, type: 'number', description: 'Number of recent signals for context', category: 'intent' },

    // Execution
    { key: 'execution.max_parallel_steps', value: 4, type: 'number', description: 'Maximum concurrent tool executions', category: 'execution' },
    { key: 'execution.step_timeout_ms', value: 120000, type: 'number', description: 'Timeout per execution step', category: 'execution' },
    { key: 'execution.max_retries', value: 2, type: 'number', description: 'Max retries per failed step', category: 'execution' },
    { key: 'execution.use_cached_paths', value: true, type: 'boolean', description: 'Use cached execution paths for known intents', category: 'execution' },

    // Evolution
    { key: 'evolution.cycle_interval', value: 10, type: 'number', description: 'Run evolution every N signals', category: 'evolution' },
    { key: 'evolution.min_samples', value: 5, type: 'number', description: 'Minimum patterns before evolving', category: 'evolution' },
    { key: 'evolution.auto_deploy', value: true, type: 'boolean', description: 'Auto-deploy improvements (vs manual review)', category: 'evolution' },
    { key: 'evolution.rollback_threshold', value: 0.1, type: 'number', description: 'Rollback if accuracy drops by this much', category: 'evolution' },
    { key: 'evolution.meta_evolution_enabled', value: true, type: 'boolean', description: 'Allow evolution engine to modify itself', category: 'evolution' },

    // AI
    { key: 'ai.primary_model', value: 'claude-sonnet-4-20250514', type: 'string', description: 'Primary LLM model', category: 'ai' },
    { key: 'ai.temperature_intent', value: 0.3, type: 'number', description: 'Temperature for intent parsing', category: 'ai' },
    { key: 'ai.temperature_execution', value: 0.5, type: 'number', description: 'Temperature for tool execution', category: 'ai' },
    { key: 'ai.temperature_creative', value: 0.7, type: 'number', description: 'Temperature for creative tools', category: 'ai' },
    { key: 'ai.max_tokens_default', value: 4096, type: 'number', description: 'Default max tokens per AI call', category: 'ai' },

    // Recovery
    { key: 'recovery.extract_all_patterns', value: true, type: 'boolean', description: 'Extract all pattern types (Constitutional: no filtering)', category: 'recovery' },
    { key: 'recovery.association_threshold', value: 0.7, type: 'number', description: 'Minimum similarity for auto-association', category: 'recovery' },
    { key: 'recovery.data_retention', value: 'permanent', type: 'string', description: 'Data retention policy', category: 'recovery' },
  ];

  for (const d of defaults) {
    await query(
      `INSERT INTO ouro_config (key, value, type, description, category)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO NOTHING`,
      [d.key, JSON.stringify(d.value), d.type, d.description, d.category]
    );
  }
}

-- Migration 0002: Add configuration and prompt management tables
-- These tables support the dynamic configuration and prompt versioning systems.

-- Prompt templates (version-controlled AI prompts)
CREATE TABLE IF NOT EXISTS prompt_templates (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    content         TEXT NOT NULL,
    variables       TEXT[] DEFAULT '{}',
    is_active       BOOLEAN DEFAULT FALSE,
    metrics         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, version)
);
CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompt_templates(name);
CREATE INDEX IF NOT EXISTS idx_prompts_active ON prompt_templates(is_active) WHERE is_active = TRUE;

-- Dynamic configuration
CREATE TABLE IF NOT EXISTS ouro_config (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL,
    type            TEXT NOT NULL DEFAULT 'string',
    description     TEXT DEFAULT '',
    category        TEXT DEFAULT 'general',
    modified_by     TEXT DEFAULT 'system',
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    version         INT DEFAULT 1
);

-- Configuration change log
CREATE TABLE IF NOT EXISTS config_changelog (
    id              TEXT PRIMARY KEY,
    key             TEXT NOT NULL,
    old_value       JSONB,
    new_value       JSONB NOT NULL,
    changed_by      TEXT NOT NULL,
    reason          TEXT DEFAULT '',
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_changelog_key ON config_changelog(key);
CREATE INDEX IF NOT EXISTS idx_changelog_time ON config_changelog(timestamp);

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
    id              SERIAL PRIMARY KEY,
    filename        TEXT UNIQUE NOT NULL,
    applied_at      TIMESTAMPTZ DEFAULT NOW(),
    checksum        TEXT NOT NULL,
    duration_ms     INT DEFAULT 0
);

-- Add clarification_asked column to intents if not exists
DO $$ BEGIN
    ALTER TABLE intents ADD COLUMN IF NOT EXISTS clarification_asked BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add total_steps and completed_steps to execution_plans if not exists  
DO $$ BEGIN
    ALTER TABLE execution_plans ADD COLUMN IF NOT EXISTS total_steps INT DEFAULT 0;
    ALTER TABLE execution_plans ADD COLUMN IF NOT EXISTS completed_steps INT DEFAULT 0;
    ALTER TABLE execution_plans ADD COLUMN IF NOT EXISTS total_duration_ms INT DEFAULT 0;
    ALTER TABLE execution_plans ADD COLUMN IF NOT EXISTS total_tokens_used INT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add feedback behavioral columns if not exists
DO $$ BEGIN
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS time_to_react_ms INT;
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS view_duration_ms INT;
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS scroll_depth FLOAT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Migration 0002: Configuration Management + Prompt Versioning + Migrations
-- These tables support the meme's self-modification capability.

-- Dynamic configuration (runtime tunable without restart)
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

CREATE INDEX IF NOT EXISTS idx_config_category ON ouro_config(category);

-- Configuration change audit trail
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

-- Version-controlled prompt templates
CREATE TABLE IF NOT EXISTS prompt_templates (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    version         INT NOT NULL,
    content         TEXT NOT NULL,
    variables       TEXT[] DEFAULT '{}',
    is_active       BOOLEAN DEFAULT FALSE,
    metrics         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, version)
);

CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompt_templates(name);
CREATE INDEX IF NOT EXISTS idx_prompts_active ON prompt_templates(is_active) WHERE is_active = TRUE;

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
    id              SERIAL PRIMARY KEY,
    filename        TEXT UNIQUE NOT NULL,
    applied_at      TIMESTAMPTZ DEFAULT NOW(),
    checksum        TEXT NOT NULL,
    duration_ms     INT DEFAULT 0
);

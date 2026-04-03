CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE signals (
    id              TEXT PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modality        TEXT NOT NULL,
    raw_content     TEXT,
    media_url       TEXT,
    media_metadata  JSONB,
    normalized_text TEXT,
    embedding       vector(1536),
    language        TEXT DEFAULT 'auto',
    context         JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'captured'
);
CREATE INDEX idx_signals_created ON signals(created_at DESC);
CREATE INDEX idx_signals_status ON signals(status);

CREATE TABLE intents (
    id              TEXT PRIMARY KEY,
    signal_id       TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    intent_type     TEXT NOT NULL,
    confidence      REAL NOT NULL,
    description     TEXT NOT NULL,
    parameters      JSONB NOT NULL DEFAULT '{}',
    clarification_asked  BOOLEAN DEFAULT FALSE,
    clarification_answer TEXT,
    was_correct     BOOLEAN,
    corrected_type  TEXT,
    corrected_params JSONB
);
CREATE INDEX idx_intents_signal ON intents(signal_id);

CREATE TABLE execution_plans (
    id              TEXT PRIMARY KEY,
    intent_id       TEXT NOT NULL REFERENCES intents(id),
    signal_id       TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    plan_dag        JSONB NOT NULL,
    status          TEXT NOT NULL DEFAULT 'planned',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    total_steps     INT NOT NULL,
    completed_steps INT NOT NULL DEFAULT 0,
    total_tokens_used   INT DEFAULT 0,
    total_api_calls     INT DEFAULT 0,
    total_duration_ms   INT DEFAULT 0
);
CREATE INDEX idx_plans_status ON execution_plans(status);

CREATE TABLE execution_steps (
    id              TEXT PRIMARY KEY,
    plan_id         TEXT NOT NULL REFERENCES execution_plans(id),
    step_index      TEXT NOT NULL,
    tool_name       TEXT NOT NULL,
    tool_input      JSONB NOT NULL,
    tool_config     JSONB DEFAULT '{}',
    depends_on      TEXT[] DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'pending',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INT,
    output          JSONB,
    output_url      TEXT,
    error           TEXT,
    tokens_used     INT DEFAULT 0,
    model_used      TEXT
);
CREATE INDEX idx_steps_plan ON execution_steps(plan_id);

CREATE TABLE artifacts (
    id              TEXT PRIMARY KEY,
    plan_id         TEXT NOT NULL REFERENCES execution_plans(id),
    signal_id       TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    artifact_type   TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    content_url     TEXT NOT NULL,
    preview_url     TEXT,
    content_hash    TEXT NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    version         INT NOT NULL DEFAULT 1,
    parent_id       TEXT REFERENCES artifacts(id),
    is_latest       BOOLEAN NOT NULL DEFAULT TRUE,
    embedding       vector(1536)
);
CREATE INDEX idx_artifacts_signal ON artifacts(signal_id);
CREATE INDEX idx_artifacts_latest ON artifacts(is_latest) WHERE is_latest = TRUE;

CREATE TABLE feedback (
    id              TEXT PRIMARY KEY,
    artifact_id     TEXT NOT NULL REFERENCES artifacts(id),
    signal_id       TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action          TEXT NOT NULL,
    modification    JSONB,
    time_to_react_ms    INT,
    view_duration_ms    INT,
    scroll_depth        REAL,
    satisfaction_score  REAL
);
CREATE INDEX idx_feedback_artifact ON feedback(artifact_id);

CREATE TABLE signal_patterns (
    id              TEXT PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pattern_type    TEXT NOT NULL,
    pattern_data    JSONB NOT NULL,
    strength        REAL NOT NULL DEFAULT 0.5,
    sample_count    INT NOT NULL DEFAULT 1,
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_patterns_type ON signal_patterns(pattern_type);

CREATE TABLE evolution_events (
    id              TEXT PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_layer    INT NOT NULL,
    target_component TEXT NOT NULL,
    change_type     TEXT NOT NULL,
    change_detail   JSONB NOT NULL,
    evidence_count  INT NOT NULL,
    expected_improvement REAL,
    actual_improvement   REAL,
    rolled_back     BOOLEAN DEFAULT FALSE
);

CREATE TABLE idea_connections (
    id              TEXT PRIMARY KEY,
    source_signal_id TEXT NOT NULL REFERENCES signals(id),
    target_signal_id TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    connection_type TEXT NOT NULL,
    strength        REAL NOT NULL DEFAULT 0.5,
    created_by      TEXT NOT NULL DEFAULT 'system',
    context         JSONB DEFAULT '{}',
    UNIQUE(source_signal_id, target_signal_id, connection_type)
);

CREATE TABLE system_state (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         INT NOT NULL DEFAULT 1
);

INSERT INTO system_state (key, value) VALUES
('intent_model_version', '"v1"'),
('tool_preference_weights', '{}'),
('prompt_templates_version', '"v1"'),
('personal_model', '{}'),
('friction_map', '{}'),
('evolution_cycle_count', '0'),
('meme_phase', '"symbiosis"');

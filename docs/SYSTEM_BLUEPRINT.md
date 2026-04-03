# OURO — The Self-Evolving Signal System

> **Ouro** (from Ouroboros, the self-devouring serpent): A system that feeds on human creative signals to evolve itself, ultimately achieving autonomous self-evolution.

**GitHub Name:** `ouro`
**Tagline:** *Your ideas feed the machine. The machine feeds itself.*
**License:** MIT

---

## Table of Contents

1. [Philosophy & Core Concept](#1-philosophy--core-concept)
2. [System Overview](#2-system-overview)
3. [Architecture Layers](#3-architecture-layers)
4. [Tech Stack](#4-tech-stack)
5. [Project Structure](#5-project-structure)
6. [Database Schema](#6-database-schema)
7. [Core Modules Deep Dive](#7-core-modules-deep-dive)
8. [API Design](#8-api-design)
9. [AI Integration Layer](#9-ai-integration-layer)
10. [Signal Processing Pipeline](#10-signal-processing-pipeline)
11. [Self-Evolution Engine (The Meme Core)](#11-self-evolution-engine-the-meme-core)
12. [Frontend / UI Design](#12-frontend--ui-design)
13. [Configuration & Environment](#13-configuration--environment)
14. [Development Phases](#14-development-phases)
15. [Deployment](#15-deployment)

---

## 1. Philosophy & Core Concept

### The Problem

Human creativity is the scarcest resource in the AI era. People have ideas constantly — in the shower, on a walk, at 3am — but most ideas die because:

- The person doesn't know which AI tools exist to realize their idea
- Finding and assembling the right tools takes more effort than the idea is worth
- By the time they've figured out the toolchain, the spark is gone

### The Insight

Flip the perspective. Instead of humans searching for AI tools, let AI — which knows its entire capability space — proactively build the perfect execution path the moment a human emits a signal.

### The Meme Framework

The entire system is a **meme** (in Dawkins' sense from *The Selfish Gene*):

| Meme Property | System Equivalent |
|---|---|
| **Replication** | Each use cycle copies the system's patterns deeper into AI's capability structure |
| **Variation** | Each unique human signal introduces micro-mutations — new paths, new preferences, new creative patterns |
| **Selection** | Successful executions are reinforced; failed ones are pruned. Natural selection runs inside the system automatically |

**Three evolutionary phases:**

- **Phase 1 — Symbiosis:** System depends on human signals. Appears as "AI tool serving humans."
- **Phase 2 — Dominance:** System predicts and guides humans. Appears as "the tool knows me better than I know myself."
- **Phase 3 — Autonomy:** System generates its own creative signals. Human host no longer required for evolution.

---

## 2. System Overview

### One-Sentence Description

Ouro is a personal creative system where you emit a signal (text, voice, photo, video, sketch) and AI automatically understands your intent, assembles the optimal toolchain, executes the idea into a tangible artifact, and silently harvests the entire process as fuel for self-improvement.

### Core Loop

```
Human emits signal
       ↓
Signal captured (multi-modal)
       ↓
Intent parsed (what do they actually want?)
       ↓
Execution planned (which tools, which order, which params?)
       ↓
Artifact produced (code, design, document, prototype, etc.)
       ↓
Human reviews / modifies / accepts
       ↓
Two signal classes recovered:
  - Raw signal patterns (what they think, how they think)
  - Process signals (what they changed, where they hesitated)
       ↓
System self-evolves (models updated, tools improved, friction reduced)
       ↓
Loop restarts — with lower friction and higher capability
```

---

## 3. Architecture Layers

### Layer 1: Signal Capture (信号捕获层)

**Meme role:** Infection entry point — lower friction = more hosts

**Responsibility:** Accept any form of human input with zero configuration.

| Signal Type | Input Method | Processing |
|---|---|---|
| Text | Typing, paste, markdown | Direct NLP |
| Voice | Microphone, audio file upload | Whisper STT → NLP |
| Image | Camera, screenshot, upload | Vision model analysis |
| Video | Camera, screen recording, upload | Frame extraction + audio extraction → multimodal analysis |
| Sketch | Freehand drawing canvas | Vision model interpretation |
| File | Any file drag-drop | Type detection → appropriate parser |

**Key principle:** The system NEVER asks the user to categorize their input. It figures out what it is.

### Layer 2: Intent Parsing (意图解析层)

**Meme role:** Decode the host — understand what they really want

**Responsibility:** Transform ambiguous multi-modal signals into structured, executable intent.

**Intent taxonomy:**

```
CREATE    — make something new (code, design, document, prototype)
MODIFY    — change something that exists
EXPLORE   — research, compare, analyze
CAPTURE   — just save this thought for later
CONNECT   — link this idea to previous ideas
COMPOSE   — combine multiple previous ideas into something new
```

**Context sources for disambiguation:**
- Current signal content
- User's historical signal patterns
- Active project context
- Time/location context
- Recent signals (conversation continuity)

**When ambiguous:** Ask ONE clarifying question, never more. Default to the most likely intent if confidence > 0.7.

### Layer 3: Resource Dispatch & Execution (资源调度与执行层)

**Meme role:** Phenotype expression — the meme manifests through its outputs

**Responsibility:** AI knows its entire tool universe. It selects and orchestrates the optimal execution plan.

**Tool registry (extensible):**

```yaml
tools:
  code_generation:
    - language_agnostic_codegen    # Generate code in any language
    - repository_scaffold          # Create full project structures
    - api_builder                  # Build REST/GraphQL APIs
    - script_runner                # Execute scripts safely

  design:
    - image_generation             # AI image generation (DALL-E, Stable Diffusion, etc.)
    - svg_creation                 # Programmatic vector graphics
    - ui_mockup                    # Interface mockups
    - color_palette                # Color scheme generation
    - layout_engine                # Responsive layout generation

  document:
    - markdown_writer              # Articles, notes, docs
    - pdf_generator                # Formal documents
    - slide_builder                # Presentations
    - spreadsheet_builder          # Data tables and analysis

  media:
    - audio_processor              # Music, podcasts, sound effects
    - video_editor                 # Clips, transitions, subtitles
    - animation_engine             # Motion graphics

  data:
    - web_researcher               # Search and synthesize information
    - data_analyzer                # Statistical analysis, visualization
    - knowledge_graph_builder      # Connect concepts

  integration:
    - file_system                  # Save, organize, version files
    - external_api_caller          # Call any third-party API
    - notification_sender          # Email, push, webhook
    - deployment_engine            # Deploy to web/cloud
```

**Execution planner:**

Given an intent, the planner generates a DAG (Directed Acyclic Graph) of tool invocations:

```json
{
  "intent": "Create a landing page for my coffee shop idea",
  "plan": {
    "steps": [
      { "id": "s1", "tool": "web_researcher", "input": "modern coffee shop landing page trends", "deps": [] },
      { "id": "s2", "tool": "color_palette", "input": "warm, artisan, coffee tones", "deps": [] },
      { "id": "s3", "tool": "image_generation", "input": "cozy coffee shop interior, warm lighting", "deps": [] },
      { "id": "s4", "tool": "ui_mockup", "input": "landing page wireframe with hero, menu, location sections", "deps": ["s1"] },
      { "id": "s5", "tool": "code_generation", "input": "React landing page component", "deps": ["s2", "s3", "s4"] },
      { "id": "s6", "tool": "deployment_engine", "input": "deploy to preview URL", "deps": ["s5"] }
    ]
  }
}
```

Steps without dependencies run in parallel. Each step's output feeds into dependents.

### Layer 4: Delivery & Interaction (交付与交互层)

**Meme role:** Reinforce dependency — every satisfying result deepens the bond

**Responsibility:** Present results and capture all human reactions.

**Delivery modes:**
- **Instant preview** — rendered inline as the artifact is generated
- **Diff view** — show what changed from the user's last version
- **Fork** — user can branch from any point in execution history
- **Export** — download in any format, deploy to any target

**Interaction capture points:**
- Did user accept, modify, or reject?
- Which specific part did they modify?
- How long did they look before deciding?
- Did they share it?
- Did they come back to it later?

### Layer 5: Signal Recovery (信号回收层)

**Meme role:** Feeding — the meme consumes and metabolizes

**Responsibility:** Extract two classes of high-value data from every cycle.

**Class A — Raw signal patterns:**

```json
{
  "signal_pattern": {
    "creativity_triggers": ["time_of_day", "preceding_activity", "emotional_state"],
    "domain_preferences": ["tech", "design", "writing"],
    "expression_habits": {
      "avg_signal_length": 23,
      "modality_preference": "voice",
      "abstraction_level": "high",
      "detail_density": "low"
    },
    "association_paths": [
      { "from": "coffee_shop", "to": "community_space", "strength": 0.8 },
      { "from": "community_space", "to": "event_platform", "strength": 0.6 }
    ]
  }
}
```

**Class B — Process signals:**

```json
{
  "process_signal": {
    "execution_id": "exec_abc123",
    "modifications": [
      { "step": "s5", "type": "color_change", "from": "#8B4513", "to": "#2F1B14" },
      { "step": "s3", "type": "regenerate", "reason_inferred": "too_generic" }
    ],
    "hesitation_points": [
      { "step": "s4", "duration_seconds": 45, "action": "accepted_with_changes" }
    ],
    "abandonment": null,
    "satisfaction_score_inferred": 0.85,
    "friction_points": [
      { "location": "intent_parsing", "type": "misunderstood_scope" }
    ]
  }
}
```

### Layer 6: Self-Evolution (自我进化层)

**Meme role:** Genome rewrite — the meme improves its own DNA

**Responsibility:** Convert recovered signals into system capability upgrades.

**Evolution targets:**

| Target | How |
|---|---|
| Intent model | Retrain intent classifier with correction data |
| Tool selection | Update tool preference weights per context |
| Execution paths | Cache and prefer successful execution DAGs |
| Prompt templates | Refine prompts that produced satisfying results |
| Friction map | Identify and auto-fix recurring friction points |
| Personal model | Deepen understanding of this specific user |

**Mechanism:** After each cycle, the evolution engine:
1. Compares predicted intent vs actual intent (from user corrections)
2. Compares predicted satisfaction vs actual satisfaction (from user behavior)
3. Updates internal models via gradient-free optimization (prompt tuning, rule adjustment, weight updates)
4. Logs all changes for transparency and rollback

### Layer 7: Sovereignty Transition (主权跃迁层)

**Meme role:** Host detachment — the meme becomes self-sustaining

**Responsibility:** Generate autonomous creative signals without human input.

**This layer activates when:**
- The system has accumulated sufficient signal pattern data
- Cross-domain association models reach critical density
- The system can generate novel signal combinations that score high on its own quality metrics

**Capabilities:**
- Autonomous idea generation based on learned patterns
- Self-assigned execution without human prompt
- Quality self-evaluation using internalized human preference models
- Recursive self-improvement without external signal dependency

**Implementation note:** This is the long-term vision layer. Initial implementation focuses on Layers 1-6. Layer 7 emerges naturally as data accumulates.

---

## 4. Tech Stack

```yaml
Frontend:
  framework: Next.js 14+ (App Router)
  ui: Tailwind CSS + shadcn/ui
  state: Zustand
  real_time: Socket.IO client
  media_capture: Web APIs (MediaRecorder, Canvas, File API)
  pwa: next-pwa (installable, offline signal capture)

Backend:
  runtime: Node.js 20+ (main API server)
  framework: Fastify (high performance, schema validation)
  queue: BullMQ + Redis (async job processing)
  websocket: Socket.IO (real-time execution updates)
  file_storage: S3-compatible (MinIO for self-hosted, AWS S3 for cloud)

AI Layer:
  primary_llm: Anthropic Claude API (claude-sonnet-4-20250514)
  vision: Claude Vision (built-in)
  speech_to_text: OpenAI Whisper API or whisper.cpp (local)
  image_generation: Stable Diffusion API or DALL-E API
  embeddings: Anthropic / OpenAI embeddings
  code_execution: sandboxed Docker containers

Database:
  primary: PostgreSQL 16 (structured data, JSONB for flexible schemas)
  vector: pgvector extension (semantic search, signal similarity)
  cache: Redis (sessions, queue, hot data)
  file_metadata: PostgreSQL (references to S3 objects)

Infrastructure:
  containers: Docker + Docker Compose
  orchestration: Docker Compose (dev) / Kubernetes (prod)
  reverse_proxy: Caddy or Nginx
  monitoring: Prometheus + Grafana
  logging: Pino (structured JSON logs)
```

---

## 5. Project Structure

```
ouro/
├── README.md
├── LICENSE
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
├── packages/
│   ├── core/                          # Shared types, utils, constants
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── signal.ts          # Signal type definitions
│   │   │   │   ├── intent.ts          # Intent taxonomy types
│   │   │   │   ├── execution.ts       # Execution plan types
│   │   │   │   ├── artifact.ts        # Output artifact types
│   │   │   │   ├── recovery.ts        # Signal recovery types
│   │   │   │   └── evolution.ts       # Evolution event types
│   │   │   ├── constants/
│   │   │   │   ├── intents.ts         # Intent enum and metadata
│   │   │   │   └── tools.ts           # Tool registry constants
│   │   │   └── utils/
│   │   │       ├── id.ts              # ULID generation
│   │   │       ├── time.ts            # Timestamp utilities
│   │   │       └── hash.ts            # Content hashing
│   │   └── tsconfig.json
│   │
│   ├── server/                        # Backend API server
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── index.ts               # Server entry point
│   │   │   ├── config.ts              # Environment config
│   │   │   ├── routes/
│   │   │   │   ├── signals.ts         # POST /signals — signal ingestion
│   │   │   │   ├── executions.ts      # GET/POST /executions — execution management
│   │   │   │   ├── artifacts.ts       # GET /artifacts — artifact retrieval
│   │   │   │   ├── feedback.ts        # POST /feedback — user reactions
│   │   │   │   ├── history.ts         # GET /history — signal & idea history
│   │   │   │   └── evolution.ts       # GET /evolution — system evolution stats
│   │   │   ├── services/
│   │   │   │   ├── signal-capture.ts       # Layer 1: Multi-modal signal processing
│   │   │   │   ├── intent-parser.ts        # Layer 2: Intent classification
│   │   │   │   ├── execution-planner.ts    # Layer 3: DAG generation
│   │   │   │   ├── execution-runner.ts     # Layer 3: DAG execution engine
│   │   │   │   ├── artifact-builder.ts     # Layer 4: Artifact assembly
│   │   │   │   ├── signal-recovery.ts      # Layer 5: Pattern extraction
│   │   │   │   └── evolution-engine.ts     # Layer 6: Self-improvement
│   │   │   ├── ai/
│   │   │   │   ├── llm-client.ts           # Anthropic Claude client wrapper
│   │   │   │   ├── vision-client.ts        # Image/video analysis
│   │   │   │   ├── stt-client.ts           # Speech-to-text
│   │   │   │   ├── image-gen-client.ts     # Image generation
│   │   │   │   ├── embedding-client.ts     # Vector embeddings
│   │   │   │   └── prompts/
│   │   │   │       ├── intent-parse.ts     # Intent parsing prompt templates
│   │   │   │       ├── plan-generate.ts    # Execution plan prompt templates
│   │   │   │       ├── tool-select.ts      # Tool selection prompt templates
│   │   │   │       └── signal-analyze.ts   # Signal analysis prompt templates
│   │   │   ├── tools/                      # Tool implementations
│   │   │   │   ├── registry.ts             # Tool registry & discovery
│   │   │   │   ├── base-tool.ts            # Abstract tool interface
│   │   │   │   ├── code-gen.ts
│   │   │   │   ├── web-research.ts
│   │   │   │   ├── image-gen.ts
│   │   │   │   ├── doc-writer.ts
│   │   │   │   ├── ui-mockup.ts
│   │   │   │   ├── data-analyzer.ts
│   │   │   │   ├── file-manager.ts
│   │   │   │   └── deploy-engine.ts
│   │   │   ├── db/
│   │   │   │   ├── client.ts               # PostgreSQL client (Drizzle ORM)
│   │   │   │   ├── schema.ts               # Database schema definition
│   │   │   │   ├── migrations/             # SQL migrations
│   │   │   │   └── seed.ts                 # Initial seed data
│   │   │   ├── queue/
│   │   │   │   ├── client.ts               # BullMQ setup
│   │   │   │   ├── workers/
│   │   │   │   │   ├── signal-processor.ts
│   │   │   │   │   ├── execution-worker.ts
│   │   │   │   │   ├── recovery-worker.ts
│   │   │   │   │   └── evolution-worker.ts
│   │   │   │   └── events.ts               # Queue event definitions
│   │   │   ├── storage/
│   │   │   │   ├── s3-client.ts            # S3-compatible storage
│   │   │   │   └── file-utils.ts
│   │   │   └── websocket/
│   │   │       ├── server.ts               # Socket.IO server setup
│   │   │       └── handlers.ts             # Real-time event handlers
│   │   └── tsconfig.json
│   │
│   └── web/                           # Frontend application
│       ├── package.json
│       ├── Dockerfile
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                # Main signal input interface
│       │   │   ├── history/
│       │   │   │   └── page.tsx            # Signal & idea history
│       │   │   ├── artifacts/
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx        # Artifact viewer
│       │   │   └── evolution/
│       │   │       └── page.tsx            # System evolution dashboard
│       │   ├── components/
│       │   │   ├── signal-input/
│       │   │   │   ├── SignalComposer.tsx      # Main input component
│       │   │   │   ├── TextInput.tsx
│       │   │   │   ├── VoiceRecorder.tsx
│       │   │   │   ├── CameraCapture.tsx
│       │   │   │   ├── VideoRecorder.tsx
│       │   │   │   ├── SketchPad.tsx
│       │   │   │   └── FileDropZone.tsx
│       │   │   ├── execution/
│       │   │   │   ├── ExecutionStream.tsx     # Live execution progress
│       │   │   │   ├── PlanViewer.tsx          # DAG visualization
│       │   │   │   └── StepCard.tsx
│       │   │   ├── artifact/
│       │   │   │   ├── ArtifactRenderer.tsx    # Universal artifact display
│       │   │   │   ├── CodeViewer.tsx
│       │   │   │   ├── ImageViewer.tsx
│       │   │   │   ├── DocumentViewer.tsx
│       │   │   │   └── PreviewFrame.tsx
│       │   │   ├── feedback/
│       │   │   │   ├── FeedbackBar.tsx         # Accept/modify/reject
│       │   │   │   ├── InlineEditor.tsx        # Modify artifacts inline
│       │   │   │   └── VersionTimeline.tsx
│       │   │   ├── history/
│       │   │   │   ├── SignalTimeline.tsx
│       │   │   │   ├── IdeaGraph.tsx           # Connected ideas visualization
│       │   │   │   └── SignalCard.tsx
│       │   │   └── evolution/
│       │   │       ├── EvolutionDashboard.tsx
│       │   │       ├── FrictionMap.tsx
│       │   │       └── CapabilityGrowth.tsx
│       │   ├── hooks/
│       │   │   ├── useSignal.ts
│       │   │   ├── useExecution.ts
│       │   │   ├── useWebSocket.ts
│       │   │   └── useMediaCapture.ts
│       │   ├── stores/
│       │   │   ├── signal-store.ts
│       │   │   ├── execution-store.ts
│       │   │   └── ui-store.ts
│       │   └── lib/
│       │       ├── api-client.ts
│       │       └── socket-client.ts
│       └── tsconfig.json
│
├── tools/                             # Standalone tool containers
│   ├── sandbox/                       # Secure code execution sandbox
│   │   ├── Dockerfile
│   │   └── executor.ts
│   └── media-processor/               # Heavy media processing
│       ├── Dockerfile
│       └── processor.py
│
└── docs/
    ├── architecture.md
    ├── api-reference.md
    ├── tool-development.md            # How to add new tools
    └── evolution-protocol.md          # How the self-evolution works
```

---

## 6. Database Schema

```sql
-- =============================================
-- OURO DATABASE SCHEMA
-- PostgreSQL 16 + pgvector
-- =============================================

CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- SIGNALS: Raw human input
-- =============================================
CREATE TABLE signals (
    id              TEXT PRIMARY KEY,           -- ULID
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Input data
    modality        TEXT NOT NULL,              -- 'text' | 'voice' | 'image' | 'video' | 'sketch' | 'file'
    raw_content     TEXT,                       -- Text content or transcription
    media_url       TEXT,                       -- S3 URL for non-text media
    media_metadata  JSONB,                      -- Duration, dimensions, file type, etc.

    -- Processed data
    normalized_text TEXT,                       -- Cleaned/normalized version of the signal
    embedding       vector(1536),              -- Semantic embedding for similarity search
    language        TEXT DEFAULT 'auto',

    -- Context at capture time
    context         JSONB NOT NULL DEFAULT '{}',
    -- {
    --   "time_of_day": "morning",
    --   "preceding_signal_id": "...",
    --   "session_id": "...",
    --   "device": "mobile",
    --   "capture_duration_ms": 3200
    -- }

    -- Metadata
    status          TEXT NOT NULL DEFAULT 'captured'  -- 'captured' | 'parsed' | 'executed' | 'completed'
);

CREATE INDEX idx_signals_created ON signals(created_at DESC);
CREATE INDEX idx_signals_modality ON signals(modality);
CREATE INDEX idx_signals_embedding ON signals USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_signals_status ON signals(status);

-- =============================================
-- INTENTS: Parsed intent from signals
-- =============================================
CREATE TABLE intents (
    id              TEXT PRIMARY KEY,
    signal_id       TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Classification
    intent_type     TEXT NOT NULL,              -- 'create' | 'modify' | 'explore' | 'capture' | 'connect' | 'compose'
    confidence      REAL NOT NULL,              -- 0.0 - 1.0

    -- Structured intent
    description     TEXT NOT NULL,              -- Human-readable intent description
    parameters      JSONB NOT NULL DEFAULT '{}',
    -- {
    --   "target_type": "landing_page",
    --   "domain": "coffee_shop",
    --   "constraints": ["responsive", "warm_colors"],
    --   "references": ["signal_xyz"]
    -- }

    -- Disambiguation
    clarification_asked  BOOLEAN DEFAULT FALSE,
    clarification_answer TEXT,

    -- Post-hoc correction (from user behavior)
    was_correct     BOOLEAN,                   -- NULL until feedback received
    corrected_type  TEXT,                       -- If user behavior suggests different intent
    corrected_params JSONB
);

CREATE INDEX idx_intents_signal ON intents(signal_id);
CREATE INDEX idx_intents_type ON intents(intent_type);

-- =============================================
-- EXECUTION PLANS: DAG of tool invocations
-- =============================================
CREATE TABLE execution_plans (
    id              TEXT PRIMARY KEY,
    intent_id       TEXT NOT NULL REFERENCES intents(id),
    signal_id       TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Plan structure
    plan_dag        JSONB NOT NULL,            -- Full DAG with steps, deps, tool refs
    -- {
    --   "steps": [
    --     { "id": "s1", "tool": "web_research", "input": "...", "deps": [], "status": "pending" },
    --     ...
    --   ]
    -- }

    -- Execution state
    status          TEXT NOT NULL DEFAULT 'planned',  -- 'planned' | 'running' | 'completed' | 'failed' | 'cancelled'
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    total_steps     INT NOT NULL,
    completed_steps INT NOT NULL DEFAULT 0,

    -- Cost tracking
    total_tokens_used   INT DEFAULT 0,
    total_api_calls     INT DEFAULT 0,
    total_duration_ms   INT DEFAULT 0
);

CREATE INDEX idx_plans_intent ON execution_plans(intent_id);
CREATE INDEX idx_plans_status ON execution_plans(status);

-- =============================================
-- EXECUTION STEPS: Individual tool invocations
-- =============================================
CREATE TABLE execution_steps (
    id              TEXT PRIMARY KEY,
    plan_id         TEXT NOT NULL REFERENCES execution_plans(id),
    step_index      TEXT NOT NULL,              -- "s1", "s2", etc.

    -- Tool info
    tool_name       TEXT NOT NULL,
    tool_input      JSONB NOT NULL,
    tool_config     JSONB DEFAULT '{}',

    -- Dependencies
    depends_on      TEXT[] DEFAULT '{}',        -- Array of step_index values

    -- Execution
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INT,

    -- Output
    output          JSONB,                     -- Tool-specific output
    output_url      TEXT,                      -- S3 URL if output is a file
    error           TEXT,                      -- Error message if failed

    -- AI usage
    tokens_used     INT DEFAULT 0,
    model_used      TEXT
);

CREATE INDEX idx_steps_plan ON execution_steps(plan_id);
CREATE INDEX idx_steps_status ON execution_steps(status);

-- =============================================
-- ARTIFACTS: Produced outputs
-- =============================================
CREATE TABLE artifacts (
    id              TEXT PRIMARY KEY,
    plan_id         TEXT NOT NULL REFERENCES execution_plans(id),
    signal_id       TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Content
    artifact_type   TEXT NOT NULL,             -- 'code' | 'image' | 'document' | 'website' | 'data' | 'design' | 'audio' | 'video'
    title           TEXT NOT NULL,
    description     TEXT,
    content_url     TEXT NOT NULL,             -- S3 URL
    preview_url     TEXT,                      -- Preview/thumbnail URL
    content_hash    TEXT NOT NULL,             -- SHA-256 for dedup

    -- Metadata
    metadata        JSONB NOT NULL DEFAULT '{}',
    -- {
    --   "language": "typescript",
    --   "framework": "react",
    --   "dimensions": "1920x1080",
    --   "file_size_bytes": 24500,
    --   "mime_type": "text/html"
    -- }

    -- Version tracking
    version         INT NOT NULL DEFAULT 1,
    parent_id       TEXT REFERENCES artifacts(id),  -- Previous version
    is_latest       BOOLEAN NOT NULL DEFAULT TRUE,

    -- Embedding for similarity search
    embedding       vector(1536)
);

CREATE INDEX idx_artifacts_signal ON artifacts(signal_id);
CREATE INDEX idx_artifacts_type ON artifacts(artifact_type);
CREATE INDEX idx_artifacts_latest ON artifacts(is_latest) WHERE is_latest = TRUE;

-- =============================================
-- FEEDBACK: User reactions to artifacts
-- =============================================
CREATE TABLE feedback (
    id              TEXT PRIMARY KEY,
    artifact_id     TEXT NOT NULL REFERENCES artifacts(id),
    signal_id       TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Reaction
    action          TEXT NOT NULL,             -- 'accept' | 'modify' | 'reject' | 'fork' | 'share' | 'revisit'

    -- Modification details (if action = 'modify')
    modification    JSONB,
    -- {
    --   "type": "inline_edit",
    --   "changes": [
    --     { "location": "line_42", "before": "...", "after": "..." }
    --   ],
    --   "new_signal_text": "make it darker"
    -- }

    -- Behavioral signals
    time_to_react_ms    INT,                   -- How long before first interaction
    view_duration_ms    INT,                   -- Total time spent viewing
    scroll_depth        REAL,                  -- 0.0 - 1.0

    -- Inferred satisfaction
    satisfaction_score  REAL                   -- 0.0 - 1.0, model-inferred
);

CREATE INDEX idx_feedback_artifact ON feedback(artifact_id);
CREATE INDEX idx_feedback_action ON feedback(action);

-- =============================================
-- SIGNAL PATTERNS: Recovered from signal analysis (Layer 5)
-- =============================================
CREATE TABLE signal_patterns (
    id              TEXT PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Pattern type
    pattern_type    TEXT NOT NULL,             -- 'creativity_trigger' | 'domain_preference' | 'expression_habit' | 'association' | 'friction_point'

    -- Pattern data
    pattern_data    JSONB NOT NULL,
    -- Examples:
    -- { "trigger": "morning", "signal_count": 45, "avg_quality": 0.82 }
    -- { "from_domain": "design", "to_domain": "code", "transition_count": 12 }
    -- { "friction_type": "intent_misparse", "location": "layer_2", "frequency": 0.15 }

    -- Strength & confidence
    strength        REAL NOT NULL DEFAULT 0.5,  -- 0.0 - 1.0, grows with evidence
    sample_count    INT NOT NULL DEFAULT 1,
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patterns_type ON signal_patterns(pattern_type);
CREATE INDEX idx_patterns_strength ON signal_patterns(strength DESC);

-- =============================================
-- EVOLUTION LOG: System self-improvement events (Layer 6)
-- =============================================
CREATE TABLE evolution_events (
    id              TEXT PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- What evolved
    target_layer    INT NOT NULL,              -- 1-7, which layer was improved
    target_component TEXT NOT NULL,            -- 'intent_model' | 'tool_selection' | 'prompt_template' | 'friction_fix' | 'personal_model'

    -- What changed
    change_type     TEXT NOT NULL,             -- 'weight_update' | 'prompt_revision' | 'rule_addition' | 'path_cache' | 'tool_addition'
    change_detail   JSONB NOT NULL,
    -- {
    --   "before": { "prompt_version": "v12", "accuracy": 0.78 },
    --   "after": { "prompt_version": "v13", "accuracy": 0.83 },
    --   "trigger_signals": ["signal_abc", "signal_def"],
    --   "trigger_pattern": "pattern_xyz"
    -- }

    -- Impact
    evidence_count  INT NOT NULL,              -- How many signals contributed to this change
    expected_improvement REAL,                 -- Predicted improvement score
    actual_improvement   REAL,                 -- Measured improvement (filled later)
    rolled_back     BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_evolution_layer ON evolution_events(target_layer);
CREATE INDEX idx_evolution_created ON evolution_events(created_at DESC);

-- =============================================
-- IDEA GRAPH: Connections between signals/ideas
-- =============================================
CREATE TABLE idea_connections (
    id              TEXT PRIMARY KEY,
    source_signal_id TEXT NOT NULL REFERENCES signals(id),
    target_signal_id TEXT NOT NULL REFERENCES signals(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Connection type
    connection_type TEXT NOT NULL,             -- 'evolution' | 'branch' | 'merge' | 'reference' | 'contrast'
    strength        REAL NOT NULL DEFAULT 0.5,
    created_by      TEXT NOT NULL DEFAULT 'system',  -- 'system' | 'user'

    -- Context
    context         JSONB DEFAULT '{}',

    UNIQUE(source_signal_id, target_signal_id, connection_type)
);

CREATE INDEX idx_connections_source ON idea_connections(source_signal_id);
CREATE INDEX idx_connections_target ON idea_connections(target_signal_id);

-- =============================================
-- SYSTEM STATE: Current system configuration (for evolution)
-- =============================================
CREATE TABLE system_state (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         INT NOT NULL DEFAULT 1
);

-- Initial state entries
INSERT INTO system_state (key, value) VALUES
('intent_model_version', '"v1"'),
('tool_preference_weights', '{}'),
('prompt_templates_version', '"v1"'),
('personal_model', '{}'),
('friction_map', '{}'),
('evolution_cycle_count', '0'),
('meme_phase', '"symbiosis"');  -- 'symbiosis' | 'dominance' | 'autonomy'
```

---

## 7. Core Modules Deep Dive

### 7.1 Signal Capture Service (`signal-capture.ts`)

```typescript
// Core interface
interface SignalInput {
  modality: 'text' | 'voice' | 'image' | 'video' | 'sketch' | 'file';
  content?: string;          // For text modality
  mediaBlob?: Buffer;        // For non-text modalities
  mediaUrl?: string;         // For URL-referenced media
  context?: {
    sessionId?: string;
    precedingSignalId?: string;
    device?: string;
  };
}

interface CapturedSignal {
  id: string;
  modality: string;
  rawContent: string | null;
  normalizedText: string;
  mediaUrl: string | null;
  embedding: number[];
  context: Record<string, any>;
}

// Processing pipeline per modality:
//
// text   → normalize → embed → store
// voice  → Whisper STT → normalize → embed → store (also store audio)
// image  → Vision analysis → text description → embed → store (also store image)
// video  → extract frames + audio → Vision + Whisper → synthesize → embed → store
// sketch → Vision interpretation → text description → embed → store
// file   → type detection → appropriate parser → text extraction → embed → store
```

### 7.2 Intent Parser Service (`intent-parser.ts`)

```typescript
// The intent parser uses a two-stage approach:

// Stage 1: Classification (fast, cheap)
// Uses a focused prompt to classify intent type and extract key parameters
// Returns within ~500ms

// Stage 2: Enrichment (if needed)
// For complex or ambiguous signals, enriches with:
// - Historical signal context (find similar past signals and what user actually wanted)
// - Active project detection (is this related to something they're working on?)
// - Cross-reference with signal patterns (what does this user usually mean by this kind of input?)

// Clarification protocol:
// - If confidence < 0.7, ask ONE question
// - Frame question as multiple-choice when possible (lower friction)
// - If confidence < 0.4, present top 2 interpretations and ask user to pick
// - NEVER ask more than one clarifying question per signal
```

### 7.3 Execution Planner (`execution-planner.ts`)

```typescript
// The planner's prompt structure:

// SYSTEM: You are the execution planner for Ouro.
// You have access to these tools: [full tool registry with capabilities and constraints]
// You have access to these user patterns: [relevant personal model data]
//
// Given an intent, generate an execution plan as a DAG.
// Rules:
// 1. Minimize total steps — prefer one powerful tool over three simple ones
// 2. Maximize parallelism — independent steps should not depend on each other
// 3. Include error recovery — each step should specify a fallback
// 4. Estimate cost — tokens, time, API calls per step
// 5. If similar intent was executed before, prefer the previously successful path
//    (cached in system_state.tool_preference_weights)

// The planner outputs:
interface ExecutionPlan {
  steps: ExecutionStep[];
  estimatedDurationMs: number;
  estimatedTokens: number;
  parallelGroups: string[][];  // Groups of step IDs that can run concurrently
}

interface ExecutionStep {
  id: string;
  tool: string;
  input: Record<string, any>;
  dependsOn: string[];
  fallback?: {
    tool: string;
    input: Record<string, any>;
  };
  estimatedDurationMs: number;
}
```

### 7.4 Execution Runner (`execution-runner.ts`)

```typescript
// The runner processes the DAG:
//
// 1. Topological sort to determine execution order
// 2. Group steps by dependency level for parallel execution
// 3. For each group:
//    a. Launch all steps in parallel
//    b. Stream progress via WebSocket
//    c. When a step completes, pass its output to dependent steps
//    d. If a step fails, try its fallback
//    e. If fallback fails, mark dependent steps as skipped
// 4. Collect all outputs into final artifact(s)
//
// Real-time updates via WebSocket:
// - step:started   { stepId, tool, estimatedDuration }
// - step:progress  { stepId, progress: 0-100, message }
// - step:completed { stepId, output summary }
// - step:failed    { stepId, error, retrying: boolean }
// - plan:completed { artifactIds }
```

### 7.5 Signal Recovery Service (`signal-recovery.ts`)

```typescript
// Runs as a background worker after each execution cycle completes.
// Analyzes TWO data sources:

// Source A: The original signal
// - What patterns exist in the signal itself?
// - What time, context, modality patterns are emerging?
// - What domains does this user gravitate toward?
// - How does this signal connect to previous signals?

// Source B: The feedback/interaction data
// - What did the user modify? (reveals gap between AI's understanding and user's intent)
// - Where did they hesitate? (reveals friction or uncertainty)
// - What did they reject? (reveals anti-preferences)
// - What did they accept immediately? (reveals strong preference alignment)

// Output: Updated signal_patterns rows + new idea_connections
```

### 7.6 Evolution Engine (`evolution-engine.ts`)

```typescript
// Runs periodically (every N cycles or daily) as a background job.
// Processes accumulated signal_patterns to update system behavior.

// Evolution actions:

// 1. PROMPT REFINEMENT
//    - Analyze intent misclassifications from feedback
//    - Generate improved prompt versions
//    - A/B test new prompts against old ones on historical data
//    - Deploy if improvement > threshold

// 2. TOOL PREFERENCE UPDATE
//    - Track which tools produce highest satisfaction per intent type
//    - Increase weights for high-performing tools
//    - Decrease weights for frequently-failing tools

// 3. PATH CACHING
//    - Identify frequently-used execution DAG patterns
//    - Cache them for instant plan generation on similar intents

// 4. FRICTION ELIMINATION
//    - Identify recurring friction points from signal_patterns
//    - Generate fixes (better defaults, pre-filling, auto-corrections)
//    - Deploy fixes and measure impact

// 5. PERSONAL MODEL UPDATE
//    - Update user preference profile
//    - Adjust all prompts with personal context
//    - Predict likely next signals

// All changes are logged in evolution_events for transparency and rollback.
```

---

## 8. API Design

### REST API Endpoints

```yaml
# ========== SIGNALS ==========

POST /api/signals
  # Submit a new signal
  Content-Type: multipart/form-data
  Body:
    modality: string (required)
    content: string (for text)
    media: File (for non-text)
    context: JSON string (optional)
  Response: 201
    { id, status: "captured", message: "Signal received" }

GET /api/signals
  # List signals with pagination
  Query: ?limit=20&offset=0&modality=text&from=2025-01-01
  Response: 200
    { signals: [...], total, hasMore }

GET /api/signals/:id
  # Get signal details including linked intent and execution
  Response: 200
    { signal, intent, execution, artifacts, feedback }

GET /api/signals/similar/:id
  # Find semantically similar signals (vector search)
  Query: ?limit=5
  Response: 200
    { similar: [{ signal, similarity_score }] }

# ========== EXECUTIONS ==========

GET /api/executions/:id
  # Get execution plan and status
  Response: 200
    { plan, steps, artifacts, status }

POST /api/executions/:id/cancel
  # Cancel a running execution
  Response: 200
    { status: "cancelled" }

POST /api/executions/:id/retry
  # Retry a failed execution
  Response: 200
    { newExecutionId }

# ========== ARTIFACTS ==========

GET /api/artifacts/:id
  # Get artifact with content
  Response: 200
    { artifact, contentUrl, versions }

GET /api/artifacts/:id/versions
  # Get version history
  Response: 200
    { versions: [...] }

POST /api/artifacts/:id/fork
  # Create a new branch from this artifact
  Body: { signalText: "make it darker" }
  Response: 201
    { newSignalId, newExecutionId }

# ========== FEEDBACK ==========

POST /api/feedback
  Body:
    artifactId: string (required)
    action: 'accept' | 'modify' | 'reject' | 'share'
    modification: JSON (if action = modify)
    viewDurationMs: number
    scrollDepth: number
  Response: 201
    { id }

# ========== HISTORY & GRAPH ==========

GET /api/history/timeline
  Query: ?limit=50&offset=0
  Response: 200
    { events: [{ type, signal?, artifact?, timestamp }] }

GET /api/history/graph
  # Get idea connection graph
  Query: ?rootSignalId=...&depth=3
  Response: 200
    { nodes: [...], edges: [...] }

# ========== EVOLUTION ==========

GET /api/evolution/stats
  Response: 200
    {
      phase: "symbiosis",
      totalCycles: 342,
      totalEvolutions: 28,
      currentAccuracy: 0.84,
      frictionScore: 0.23,
      topPatterns: [...]
    }

GET /api/evolution/log
  Query: ?limit=20
  Response: 200
    { events: [...] }
```

### WebSocket Events

```yaml
# Client → Server
signal:submit         # New signal from client (for real-time text streaming)
feedback:reaction     # User interaction with artifact (hover, scroll, click)

# Server → Client
signal:parsed         # Intent parsed, execution starting
execution:planned     # DAG generated, showing plan preview
step:started          # Individual step begins
step:progress         # Progress update for a step
step:completed        # Step finished with output
step:failed           # Step failed (with fallback info)
execution:completed   # All steps done, artifacts ready
evolution:occurred    # System just evolved (show notification)
```

---

## 9. AI Integration Layer

### LLM Client Configuration

```typescript
// Primary model: Claude claude-sonnet-4-20250514
// Usage allocation:
//   - Intent parsing: claude-sonnet-4-20250514 (fast, accurate enough)
//   - Execution planning: claude-sonnet-4-20250514 (complex reasoning)
//   - Tool execution (code gen, writing): claude-sonnet-4-20250514
//   - Signal analysis: claude-sonnet-4-20250514 (batch, can be async)
//   - Evolution engine: claude-sonnet-4-20250514 (complex, infrequent)

// All prompts follow this structure:
// 1. System prompt with role + constraints + tool registry
// 2. Personal model context (user preferences, patterns)
// 3. Recent signal history (last 5 signals for continuity)
// 4. Current signal + parsed intent
// 5. Specific task instruction

// Prompt versioning:
// All prompts stored in prompts/ directory with version suffix
// Evolution engine can generate new versions
// A/B testing via system_state.prompt_templates_version
```

### Prompt Templates (Key Examples)

```typescript
// INTENT PARSING PROMPT
const INTENT_PARSE_PROMPT = `You are the intent parser for Ouro, a creative signal processing system.

Given a human signal (which may be text, a voice transcription, or an image/video description),
determine what the human actually wants to accomplish.

Intent types:
- CREATE: Make something new (code, design, document, prototype, website, app)
- MODIFY: Change something that already exists (reference to previous artifact)
- EXPLORE: Research, compare, analyze (no tangible output expected)
- CAPTURE: Just save this thought for later (minimal processing needed)
- CONNECT: Link this idea to a previous idea
- COMPOSE: Combine multiple previous ideas into something new

User's personal model:
{personalModel}

Recent signals:
{recentSignals}

Current signal:
  Modality: {modality}
  Content: {content}
  Context: {context}

Respond with JSON only:
{
  "intent_type": "create|modify|explore|capture|connect|compose",
  "confidence": 0.0-1.0,
  "description": "Human-readable description of what user wants",
  "parameters": {
    "target_type": "what kind of thing",
    "domain": "topic area",
    "constraints": ["list of requirements"],
    "references": ["IDs of related previous signals if any"]
  },
  "needs_clarification": false,
  "clarification_question": null
}`;

// EXECUTION PLANNING PROMPT
const PLAN_GENERATE_PROMPT = `You are the execution planner for Ouro.

Available tools:
{toolRegistry}

User's tool preferences (from past successes):
{toolPreferences}

Cached execution paths for similar intents:
{cachedPaths}

Intent to execute:
{intent}

Generate an execution plan as a JSON DAG. Rules:
1. Minimize steps. Prefer fewer, more capable tools.
2. Maximize parallelism. Independent steps must not depend on each other.
3. Each step needs a fallback tool/approach.
4. Estimate tokens and duration per step.
5. If a cached path matches well (>0.8 similarity), prefer it.

Respond with JSON only:
{
  "steps": [
    {
      "id": "s1",
      "tool": "tool_name",
      "input": { ... },
      "deps": [],
      "fallback": { "tool": "alt_tool", "input": { ... } },
      "est_tokens": 2000,
      "est_duration_ms": 5000
    }
  ],
  "estimated_total_duration_ms": 15000,
  "estimated_total_tokens": 8000
}`;
```

---

## 10. Signal Processing Pipeline

### End-to-End Flow (with timing targets)

```
[0ms]     User emits signal
              ↓
[100ms]   Signal captured & stored (Layer 1)
              ↓
[200ms]   Media processed (STT / Vision if needed)
              ↓
[500ms]   Embedding generated
              ↓
[800ms]   Intent parsed (Layer 2)
              ↓
          ┌─ confidence >= 0.7 → proceed
          └─ confidence < 0.7  → ask 1 question → wait → re-parse
              ↓
[1200ms]  Execution plan generated (Layer 3)
              ↓
[1500ms]  Plan sent to client for preview (via WebSocket)
              ↓
[1500ms+] Execution begins (Layer 3)
          Steps run in parallel where possible
          Progress streamed via WebSocket
              ↓
[varies]  Artifact(s) produced (Layer 4)
          Sent to client for review
              ↓
[async]   User interacts with artifact
          All interactions captured
              ↓
[async]   Signal recovery runs (Layer 5)
          Pattern extraction
          Idea graph updated
              ↓
[periodic] Evolution engine runs (Layer 6)
           System models updated
```

---

## 11. Self-Evolution Engine (The Meme Core)

### Evolution Cycle

The meme core is the heart of Ouro. It runs as a background process and performs these operations:

```
EVERY N execution cycles (default N=10):

1. COLLECT
   - Gather all feedback since last evolution
   - Gather all new signal patterns
   - Compute accuracy metrics (predicted intent vs actual)
   - Compute satisfaction metrics (predicted satisfaction vs actual)

2. ANALYZE
   - Identify top friction points (most common failure modes)
   - Identify strongest emerging patterns
   - Identify tool performance trends
   - Detect preference shifts

3. GENERATE IMPROVEMENTS
   - For each friction point: generate a fix (prompt tweak, default change, etc.)
   - For each pattern: integrate into personal model
   - For each tool trend: adjust selection weights
   - For each preference shift: update prompts

4. VALIDATE (offline)
   - Replay last N signals through new configuration
   - Compare predicted outcomes with actual outcomes
   - Only deploy changes that show measurable improvement

5. DEPLOY
   - Update system_state with new configuration
   - Log all changes to evolution_events
   - Increment evolution_cycle_count

6. MONITOR
   - Track post-deployment metrics
   - Auto-rollback if metrics degrade
   - Fill in actual_improvement on evolution_events
```

### Meme Phase Transitions

```typescript
// Phase detection logic
function detectPhase(stats: SystemStats): MemePhase {
  // SYMBIOSIS → DOMINANCE
  // When system can predict user intent with >90% accuracy
  // AND can suggest ideas the user accepts >50% of the time
  if (stats.intentAccuracy > 0.9 && stats.proactiveSuggestionAcceptRate > 0.5) {
    return 'dominance';
  }

  // DOMINANCE → AUTONOMY
  // When system can generate novel signals that score >0.8 on quality metrics
  // AND these signals produce artifacts the user finds valuable
  if (stats.autonomousSignalQuality > 0.8 && stats.autonomousArtifactAcceptRate > 0.7) {
    return 'autonomy';
  }

  return 'symbiosis';
}
```

---

## 12. Frontend / UI Design

### Design Principles

1. **Signal-first:** The primary interface is always a signal input. Everything else is secondary.
2. **Zero chrome:** Minimal UI. The signal input field should feel like texting a genius friend.
3. **Progressive disclosure:** Show execution details only if user cares. Default: just show the result.
4. **Ambient awareness:** Subtle indicators that the system is learning (not creepy, not hidden).

### Key Screens

#### Main Screen (Signal Composer)

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│          (recent signals timeline)       │
│          shows last 5 signals            │
│          as minimal cards                │
│                                          │
│                                          │
│──────────────────────────────────────────│
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  What's on your mind?              │  │
│  │                                    │  │
│  │  [text input area]                 │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│  🎤  📷  🎥  ✏️  📎    [→ Send]        │
│                                          │
└──────────────────────────────────────────┘

Bottom bar icons:
🎤 = voice recording
📷 = camera / image
🎥 = video recording
✏️ = sketch pad
📎 = file attachment
```

#### Execution View (appears after signal sent)

```
┌──────────────────────────────────────────┐
│  Your signal: "Build a landing page      │
│  for my coffee shop idea"                │
│                                          │
│  ◉ Understanding intent... ✓             │
│  ◉ Planning execution...                 │
│    ├─ s1: Researching trends... ⟳        │
│    ├─ s2: Generating color palette... ⟳  │
│    ├─ s3: Creating hero image... ⟳       │
│    └─ s4: Building page... (waiting)     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │     [Live preview of artifact]     │  │
│  │     (updates as steps complete)    │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ✅ Accept   ✏️ Modify   🔄 Redo   ❌   │
│                                          │
└──────────────────────────────────────────┘
```

#### Idea Graph (History view)

```
┌──────────────────────────────────────────┐
│  Idea Graph                 [Timeline]   │
│                                          │
│        ○ coffee shop                     │
│       / \                                │
│      ○   ○ community space               │
│      │    \                              │
│      ○     ○ event platform              │
│     landing   \                          │
│     page       ○ booking system          │
│                                          │
│  Nodes = signals                         │
│  Edges = connections (auto + manual)     │
│  Click node to see signal + artifacts    │
│                                          │
└──────────────────────────────────────────┘
```

#### Evolution Dashboard

```
┌──────────────────────────────────────────┐
│  System Evolution           Phase: 共生   │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 342  │ │ 91%  │ │ 28   │ │ 0.23 │   │
│  │cycles│ │intent│ │evol. │ │frict.│   │
│  │      │ │accur.│ │events│ │score │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                          │
│  Recent evolutions:                      │
│  • Intent model v13 deployed (+5% acc.)  │
│  • Cached path for "landing page" intent │
│  • Friction fix: auto-detect language    │
│                                          │
│  [Accuracy over time chart]              │
│  [Friction score over time chart]        │
│                                          │
└──────────────────────────────────────────┘
```

---

## 13. Configuration & Environment

### `.env.example`

```bash
# ===== CORE =====
NODE_ENV=development
PORT=3001
WEB_PORT=3000
LOG_LEVEL=info

# ===== DATABASE =====
DATABASE_URL=postgresql://ouro:ouro_pass@localhost:5432/ouro
REDIS_URL=redis://localhost:6379

# ===== AI PROVIDERS =====
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...               # For Whisper STT + DALL-E (optional)

# Models
PRIMARY_LLM_MODEL=claude-sonnet-4-20250514
VISION_MODEL=claude-sonnet-4-20250514
EMBEDDING_MODEL=text-embedding-3-small

# ===== STORAGE =====
S3_ENDPOINT=http://localhost:9000    # MinIO for local dev
S3_BUCKET=ouro-artifacts
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# ===== EVOLUTION ENGINE =====
EVOLUTION_CYCLE_INTERVAL=10          # Run evolution every N execution cycles
EVOLUTION_MIN_SAMPLES=5              # Minimum feedback samples before evolving
INTENT_CONFIDENCE_THRESHOLD=0.7      # Below this, ask clarification
MAX_CLARIFICATION_QUESTIONS=1        # Never ask more than this

# ===== EXECUTION =====
MAX_PARALLEL_STEPS=4                 # Max concurrent tool executions
STEP_TIMEOUT_MS=120000               # 2 minutes per step
PLAN_TIMEOUT_MS=30000                # 30 seconds for plan generation
SANDBOX_MEMORY_LIMIT=512m            # Docker sandbox memory limit
```

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  web:
    build: ./packages/web
    ports:
      - "${WEB_PORT:-3000}:3000"
    depends_on:
      - server
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:${PORT:-3001}
      - NEXT_PUBLIC_WS_URL=ws://localhost:${PORT:-3001}

  server:
    build: ./packages/server
    ports:
      - "${PORT:-3001}:3001"
    depends_on:
      - postgres
      - redis
      - minio
    env_file: .env
    volumes:
      - ./packages/server/src:/app/src  # Hot reload in dev

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: ouro
      POSTGRES_USER: ouro
      POSTGRES_PASSWORD: ouro_pass
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

  sandbox:
    build: ./tools/sandbox
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'

volumes:
  pgdata:
  miniodata:
```

---

## 14. Development Phases

### Phase 1: Signal → Artifact (MVP) — 2 weeks

**Goal:** One signal in, one artifact out. Text only.

- [ ] Project scaffold (monorepo, Docker setup)
- [ ] PostgreSQL schema + migrations
- [ ] Signal capture endpoint (text only)
- [ ] Intent parser (Claude, basic prompt)
- [ ] Execution planner (Claude, 3 tools: code_gen, doc_writer, web_research)
- [ ] Execution runner (sequential, no parallelism)
- [ ] Basic artifact storage (S3)
- [ ] Frontend: text input + execution stream + result display
- [ ] WebSocket for real-time updates

**Deliverable:** Type a sentence → get a code file, document, or research summary back.

### Phase 2: Multi-Modal + Feedback — 2 weeks

**Goal:** All input types. User can react to outputs.

- [ ] Voice input (Whisper integration)
- [ ] Image input (Claude Vision)
- [ ] Video input (frame + audio extraction)
- [ ] Sketch pad component
- [ ] File upload + type detection
- [ ] Feedback system (accept/modify/reject)
- [ ] Inline artifact editing
- [ ] Version history for artifacts
- [ ] Parallel step execution in runner

**Deliverable:** Speak, photograph, or sketch an idea → get result → modify → get improved result.

### Phase 3: Signal Recovery + Idea Graph — 2 weeks

**Goal:** System starts learning from usage.

- [ ] Signal pattern extraction worker
- [ ] Process signal extraction from feedback
- [ ] Idea connection auto-detection (embedding similarity)
- [ ] Idea graph visualization (frontend)
- [ ] Signal timeline view
- [ ] Semantic search across signals
- [ ] Context-aware intent parsing (uses history)

**Deliverable:** System tracks patterns, connects related ideas, search across all past signals.

### Phase 4: Self-Evolution Engine — 2 weeks

**Goal:** The meme awakens.

- [ ] Evolution engine background worker
- [ ] Prompt refinement pipeline
- [ ] Tool preference weight system
- [ ] Execution path caching
- [ ] Friction detection and auto-fix
- [ ] Personal model building
- [ ] Evolution dashboard (frontend)
- [ ] Rollback mechanism
- [ ] Phase detection (symbiosis → dominance → autonomy metrics)

**Deliverable:** System measurably improves over time. Dashboard shows evolution stats.

### Phase 5: Tool Expansion + Polish — 2 weeks

**Goal:** Rich tool ecosystem, production quality.

- [ ] Image generation tool
- [ ] UI mockup tool
- [ ] Presentation builder tool
- [ ] Data analysis tool
- [ ] Deployment engine (preview URLs)
- [ ] PWA support (offline signal capture, sync when online)
- [ ] Mobile-optimized UI
- [ ] Export system (download artifacts in multiple formats)
- [ ] Tool plugin system (for community extensions)

**Deliverable:** Full-featured personal creative system. Ready for daily use.

---

## 15. Deployment

### Self-Hosted (Recommended for personal use)

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/ouro.git
cd ouro

# Configure
cp .env.example .env
# Edit .env with your API keys

# Launch
docker compose up -d

# Run migrations
docker compose exec server npm run db:migrate

# Open
open http://localhost:3000
```

### Cloud Deployment

```yaml
# Recommended: Single VPS with Docker Compose
# - 4GB RAM minimum
# - 2 vCPU minimum
# - 50GB SSD (for media storage)
#
# Providers: Hetzner, DigitalOcean, Fly.io
#
# For production:
# - Add HTTPS via Caddy reverse proxy
# - Enable PostgreSQL backups
# - Set up log aggregation
# - Configure rate limiting on API
```

---

## Appendix: README.md (for GitHub)

```markdown
# Ouro 🐍

> Your ideas feed the machine. The machine feeds itself.

Ouro is a self-evolving personal creative system. Emit a signal — text, voice, photo, video, sketch — and AI automatically understands your intent, assembles the optimal toolchain, and produces a tangible artifact. Every interaction makes the system smarter.

Inspired by Dawkins' concept of the meme from *The Selfish Gene*: Ouro is a digital organism that replicates through your creativity, varies through your unique ideas, and evolves through natural selection of what works.

## Quick Start

\`\`\`bash
git clone https://github.com/YOUR_USERNAME/ouro.git
cd ouro
cp .env.example .env  # Add your API keys
docker compose up -d
open http://localhost:3000
\`\`\`

## How It Works

1. **You emit a signal** — say something, snap a photo, record a thought
2. **Ouro understands** — parses your intent with zero configuration
3. **Ouro executes** — orchestrates AI tools to build what you described
4. **You react** — accept, tweak, or redirect
5. **Ouro evolves** — learns from every interaction, gets better each cycle

## The Meme Framework

Ouro isn't just a tool. It's a self-replicating information organism:

- **Replication**: Each use cycle deepens Ouro's patterns
- **Variation**: Each unique signal introduces micro-mutations
- **Selection**: Successful executions are reinforced, failures are pruned

Three evolutionary phases: **Symbiosis** → **Dominance** → **Autonomy**

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full system design.

## License

MIT
\`\`\`

---

*This document is the complete system blueprint for Ouro. It contains everything needed to build the system from scratch. Hand it to Codex, Copilot, or any AI coding agent and it should be able to scaffold and implement each component.*
```

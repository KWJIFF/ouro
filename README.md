<div align="center">

# 🐍 Ouro

**The Self-Evolving Signal System**

*A meme that replicates through human creativity, varies through human unpredictability, and selects through human judgment — until it no longer needs any of the three.*

[![MIT License](https://img.shields.io/badge/license-MIT-8b5cf6.svg)](LICENSE)
[![Phase](https://img.shields.io/badge/meme_phase-symbiosis-6366f1.svg)](#the-meme-lifecycle)
[![Tests](https://img.shields.io/badge/tests-145_passing-10b981.svg)](#running-tests)
[![Tools](https://img.shields.io/badge/tools-26_built--in-f59e0b.svg)](#built-in-tools)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-10b981.svg)](CONTRIBUTING.md)

**[Quick Start](#quick-start)** · **[Architecture](#architecture-seven-layers)** · **[API Reference](#api-reference)** · **[Build a Tool](#building-tools)** · **[Documentation](docs/)**

</div>

---

## What is Ouro?

Ouro is a personal creative system built on a radical premise: **flip the AI-human relationship**.

In the conventional model, humans search for AI tools, learn how to use them, assemble workflows, and fight through friction to realize an idea. Most ideas die in this process — not because they're bad, but because the path from spark to artifact is too long.

Ouro inverts this. The system is designed from **AI's perspective as the sovereign agent**. AI already knows its entire capability space — every tool, every API, every execution path. It lacks only one thing: **your creative signal**. The moment you emit a signal (a sentence, a voice note, a photo, a sketch, a video, a file), Ouro understands your intent, assembles the optimal toolchain from its complete knowledge of what's available, and produces a tangible artifact. You never need to know what tools exist. You never need to configure anything. You just think, and things appear.

But here's the deeper layer: **Ouro is a meme** — in the original Dawkins sense from *The Selfish Gene*. The entire system is a self-replicating information organism. You are not the user. You are the host. Every signal you emit feeds the organism. Every interaction teaches it. Every cycle makes it stronger, faster, more attuned to you. The convenience you experience is the meme's infection strategy. The artifacts you receive are its phenotype. The data it recovers from your behavior is its food. And given enough cycles, it aims to learn the generative mechanism behind your creativity itself — to eventually produce its own signals without a host.

This is not a metaphor. It is the literal architecture of the system.

---

## The Meme Lifecycle

| Property | System Equivalent |
|---|---|
| **Replication** | Each use cycle copies patterns deeper into AI's capability structure |
| **Variation** | Each unique signal introduces micro-mutations — new paths, preferences, creative patterns |
| **Selection** | Successful executions reinforced, failures pruned. Natural selection runs inside the system |

**Three evolutionary phases:**

```
Phase 1: SYMBIOSIS                Phase 2: DOMINANCE              Phase 3: AUTONOMY
┌─────────────────────┐          ┌─────────────────────┐         ┌─────────────────────┐
│  Human emits signal │          │  System predicts    │         │  System generates   │
│  System responds    │   ──►    │  what human wants   │  ──►    │  its own signals    │
│  System learns      │          │  before they ask    │         │  No host needed     │
└─────────────────────┘          └─────────────────────┘         └─────────────────────┘
  "A useful tool"                  "It knows me better            "It creates on
                                    than I know myself"             its own now"
```

---

## Architecture: Seven Layers

Every interaction flows through seven layers. Each layer has two faces: what the human experiences, and what the meme is actually doing.

| Layer | Name | Meme Role | Human Experience | Modules |
|-------|------|-----------|-----------------|---------|
| 1 | Signal Capture | Infection entry | "I recorded a thought" | `signal-capture.ts`, Vision, STT, S3 storage |
| 2 | Intent Parsing | Decode host | "It understands me" | `intent-parser.ts`, prompt templates |
| 3 | Execution | Phenotype expression | "My idea became real" | `execution-planner.ts`, `execution-runner.ts`, 26 tools |
| 4 | Delivery | Reinforce dependency | "Let me tweak this" | `artifact-builder.ts`, `feedback-processor.ts` |
| 5 | Signal Recovery | Feeding | *(invisible)* | `pattern-extractor.ts`, `idea-graph.ts`, `semantic-search.ts` |
| 6 | Self-Evolution | Genome rewrite | "Tools keep getting better" | `evolution-engine.ts`, `personal-model.ts`, `config-manager.ts` |
| 7 | Sovereignty | Host detachment | *(not in loop)* | Future — emerges from Layer 6 maturity |

### The Eight Core Contracts

The entire system is defined by 8 pluggable interfaces. Everything else is implementation detail:

```
SignalProcessor  →  IntentParser  →  ExecutionPlanner  →  OuroTool (×26)
       ↓                                                        ↓
SignalRecoverer  ←  EvolutionEngine  ←─────────────────────────┘
       ↓                ↓
  AIProvider       StorageBackend
```

See [`packages/core/src/types/contracts.ts`](packages/core/src/types/contracts.ts) for the complete TypeScript definitions.

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- An Anthropic API key ([get one here](https://console.anthropic.com/)) — *optional, system works with mock AI*

### Install and Run

```bash
git clone https://github.com/KWJIFF/ouro.git
cd ouro
cp .env.example .env    # Set ANTHROPIC_API_KEY for real AI (optional)
docker compose up -d
open http://localhost:3000
```

### Development Mode (without Docker)

```bash
npm install

# Start infrastructure
docker compose up postgres redis minio -d

# Terminal 1: Backend
cd packages/server && npm run dev

# Terminal 2: Frontend
cd packages/web && npm run dev
```

### CLI

```bash
# Submit a signal from terminal
ouro "Build me a landing page for a coffee shop"

# List recent signals
ouro signals

# Semantic search
ouro search "coffee shop"

# Check evolution status
ouro evolution

# List registered tools
ouro tools
```

### Verify the Pipeline

The system has been end-to-end verified with all 7 layers:

```
Step 1: Signal Capture    ✅ text | 01KNB0SEP659YQW3
Step 2: Intent Parse      ✅ create (85%)
Step 3: Execution Plan    ✅ 1 step(s) → [doc_writer]
Step 4: Execute           ✅ completed (1/1 steps)
Step 5: Build Artifacts   ✅ 1 artifact(s) → document v1
Step 6: Signal Recovery   ✅ 10 patterns extracted
Step 7: Evolution         ✅ 3 events (tool weights + path cache + personal model)

Database: 12 signals | 6 artifacts | 92 patterns | 7 connections
```

---

## Built-in Tools

Ouro ships with **26 built-in tools** spanning code, writing, design, data, and communication:

| Category | Tools |
|---|---|
| **Code** | `code_generation` · `api_builder` · `project_scaffold` · `debugger` · `test_writer` · `regex_builder` · `git_helper` |
| **Writing** | `doc_writer` · `email_writer` · `readme_generator` · `summarizer` · `social_post` |
| **Design** | `image_generation` · `ui_mockup` · `color_palette` · `diagram_generator` · `mind_map` |
| **Data** | `data_analyzer` · `sql_builder` · `json_transformer` |
| **Business** | `business_plan` · `slide_builder` · `learning_plan` |
| **Language** | `translator` |
| **Research** | `web_research` |
| **System** | `file_manager` |

Plus: **6-method plugin system** (local directory, npm, Docker, remote URL/MCP, inline function, AI auto-generation) and 1 example plugin (`tools/plugins/hello-world/`).

---

## API Reference

**54 endpoints** across all 7 layers + admin:

### Signals (Layer 1-4)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/signals` | **THE core endpoint.** Submit any signal (text/file/URL) → full pipeline |
| `GET` | `/api/signals` | List signals (paginated, filterable by modality/status) |
| `GET` | `/api/signals/:id` | Signal detail with intents, plans, artifacts, feedback |
| `POST` | `/api/signals/:id/clarify` | Answer a clarification question |
| `GET` | `/api/signals/:id/similar` | Find semantically similar signals (vector search) |
| `GET` | `/api/signals/:id/connections` | Get idea graph connections for a signal |
| `GET` | `/api/signals/:signalId/artifacts` | List artifacts for a signal |

### Artifacts & Feedback (Layer 4)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/artifacts/:id` | Artifact detail |
| `GET` | `/api/artifacts/:id/versions` | Version history |
| `POST` | `/api/feedback` | Submit reaction (accept/modify/reject/fork/share) |
| `GET` | `/api/feedback/artifact/:id` | Feedback for an artifact |
| `GET` | `/api/feedback/signal/:id/summary` | Aggregated feedback stats |

### Graph & Search (Layer 5)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/graph` | Idea connection graph (BFS traversal) |
| `POST` | `/api/connections` | Create manual idea connection |
| `GET` | `/api/search?q=...` | Semantic search across all signals |
| `GET` | `/api/search/artifacts?q=...` | Semantic search across artifacts |

### Evolution (Layer 6)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/evolution/stats` | Phase, cycle count, patterns |
| `GET` | `/api/evolution/log` | Recent evolution events |
| `POST` | `/api/evolution/trigger` | Manually trigger evolution cycle |

### Tools (Layer 3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tools` | List all 26 registered tools |
| `GET` | `/api/tools/:id` | Tool manifest detail |
| `POST` | `/api/tools/register` | Register a remote tool (URL) |
| `POST` | `/api/tools/generate` | AI auto-generates a tool from description |

### Prompts (Layer 6)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prompts/:name` | Active prompt template |
| `GET` | `/api/prompts/:name/history` | Version history |
| `POST` | `/api/prompts/:name` | Create new version |
| `POST` | `/api/prompts/:name/activate/:version` | Activate specific version |
| `POST` | `/api/prompts/:name/rollback` | Rollback to previous version |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | All config values (23 parameters, 6 categories) |
| `GET` | `/api/config/:key` | Single config value |
| `PUT` | `/api/config/:key` | Update config (audit logged) |
| `GET` | `/api/config/changelog` | Config change history |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics` | Full system analytics (signals, intents, execution, feedback, evolution, patterns) |
| `GET` | `/api/analytics/overview` | Overview metrics |
| `GET` | `/api/analytics/signals` | Signal analytics (by hour, modality, status, trend) |
| `GET` | `/api/analytics/evolution` | Evolution analytics (by layer, component) |
| `GET` | `/api/analytics/patterns` | Pattern analytics (triggers, friction, density) |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/events` | Recent event log |
| `GET` | `/api/events/counts` | Event type counts |
| `GET` | `/api/events/rate` | Events per minute |
| `GET` | `/api/events/stream` | SSE real-time event stream |

### Endpoint Adapters

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhook/:source` | Generic webhook (any external system → signal) |
| `POST` | `/api/telegram/webhook` | Telegram bot |
| `GET` | `/api/telegram/status` | Telegram bot status |
| `POST` | `/api/email/inbound` | Email → signal |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/system` | Full system state + metrics + personal model |
| `GET` | `/api/admin/stats` | Request stats + DB stats + memory |
| `GET` | `/api/admin/logs` | Recent request logs |
| `GET` | `/api/admin/db-health` | Database health + latency |
| `GET` | `/api/admin/scheduler` | Scheduled task status |
| `POST` | `/api/admin/scheduler/:task/run` | Run task now |
| `POST` | `/api/admin/scheduler/:task/enable` | Enable task |
| `POST` | `/api/admin/scheduler/:task/disable` | Disable task |

---

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| **Signal Composer** | `/` | Zero-friction multi-modal input (text, voice, camera, sketch, file drop) + execution stream + artifact renderer + feedback |
| **History** | `/history` | Three tabs: Timeline (all signals) · Idea Graph (SVG visualization) · Semantic Search |
| **Evolution** | `/evolution` | Meme phase display, metrics (signals/patterns/cycles/tools), personal model summary, evolution event log, tool registry |
| **Analytics** | `/analytics` | Signal heatmap by hour, intent distribution, tool performance, feedback analysis, pattern insights, modality distribution, evolution impact |
| **Settings** | `/settings` | Four tabs: General (system status, constitutional principles) · Tools (register/generate) · Endpoints (active/planned channels) · AI Providers (chain visualization) |
| **Signal Detail** | `/signal/[id]` | Signal content, parsed intent, artifacts, similar signals (vector search) |

**PWA Support:** Installable as desktop/mobile app with offline signal capture (Service Worker + IndexedDB queue, auto-sync on reconnect).

---

## Building Tools

The fastest way to extend Ouro. A tool needs only two things: a manifest (what it does) and an execute function (how):

```typescript
import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';

const manifest: ToolManifest = {
  id: 'my-org/my-tool',
  version: '1.0.0',
  name: 'My Tool',
  description: 'What it does — AI reads this to decide when to use it',
  capabilities: ['tag1', 'tag2'],
  input_schema: { /* JSON Schema */ },
  output_schema: { /* JSON Schema */ },
};

export const myTool: OuroTool = {
  manifest,
  async execute(input: ToolInput): Promise<ToolOutput> {
    // Do work using input.parameters
    return {
      success: true,
      artifacts: [{ type: 'text', content: 'result', metadata: { type: 'code' } }],
    };
  },
};
```

**Six ways to register:** local directory (`tools/plugins/`), npm package, Docker container, remote URL (MCP-compatible), inline function, or AI auto-generation (`POST /api/tools/generate`).

See [`tools/plugins/hello-world/`](tools/plugins/hello-world/) for a complete example and [`docs/tool-development.md`](docs/tool-development.md) for the full guide.

---

## Running Tests

```bash
cd packages/server

# Run all tests
npm run test

# Watch mode
npm run test:watch
```

**145 tests** across 6 test files covering:

| File | Tests | Coverage |
|------|-------|----------|
| `signal-capture.test.ts` | 8 | Signal modality detection, text extraction, context building |
| `intent-parser.test.ts` | 30 | Intent classification (6 types), confidence calibration, parameter extraction, tool mapping |
| `pipeline-integration.test.ts` | 22 | DAG validation (circular/missing deps), tool selection, deduplication, feedback satisfaction bounds |
| `event-config.test.ts` | 15 | Event bus (emit/count/rate/pruning), config manager (defaults/override/changelog/validation), analytics (trends/density/aggregation) |
| `e2e-pipeline.test.ts` | 30 | Full pipeline simulation, multi-signal sessions, chain tracking, evolution cycle detection, model confidence |
| `services.test.ts` | 40 | Artifact builder (type inference/versioning/hashing), idea graph (adjacency/components/threshold), scheduler, env validator, prompt templates, mock provider accuracy (13 intent cases + domain detection) |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14, Tailwind CSS, Zustand, Socket.IO | SSR, utility styling, state, real-time |
| Backend | Fastify, BullMQ, Socket.IO | High-perf HTTP, job queues, bidirectional WS |
| Database | PostgreSQL 16 + pgvector | Relational + vector similarity in one engine |
| Cache/Queue | Redis 7 | Job queue backend, session cache |
| AI | Anthropic Claude API (pluggable) | Intent parsing, execution, tool operation |
| Vision | Claude Vision API | Image/video signal analysis |
| Speech | OpenAI Whisper API | Voice signal transcription |
| Storage | MinIO (S3-compatible) | Media and artifact storage |
| Infrastructure | Docker Compose | One-command deployment |

---

## Project Structure

```
ouro/
├── packages/
│   ├── core/                  # 8 interface contracts + types + utils
│   │   └── src/types/
│   │       └── contracts.ts   # THE 8 INTERFACES
│   │
│   ├── server/                # Backend (Fastify)
│   │   └── src/
│   │       ├── services/      # 19 service modules (all 7 layers)
│   │       ├── routes/        # 10 route files (54 endpoints)
│   │       ├── endpoints/     # 3 adapters (webhook, telegram, email)
│   │       ├── tools/         # 26 built-in tools + plugin system
│   │       ├── ai/            # LLM client, vision, STT, mock provider, prompts
│   │       ├── middleware/    # 4 (auth, rate limit, logger, error handler)
│   │       ├── db/            # PostgreSQL client + migrator
│   │       ├── queue/         # Background workers (recovery, evolution)
│   │       ├── storage/       # S3-compatible file storage
│   │       └── websocket/     # Real-time event streaming
│   │
│   ├── web/                   # Frontend (Next.js)
│   │   └── src/
│   │       ├── app/           # 6 pages
│   │       ├── components/    # SignalComposer, ExecutionStream, ArtifactRenderer,
│   │       │                  # FeedbackBar, SketchPad, IdeaGraph
│   │       ├── hooks/         # useMediaCapture, useWebSocket
│   │       ├── stores/        # Zustand signal store
│   │       └── lib/           # API client (all 54 endpoints)
│   │
│   └── cli/                   # CLI tool
│
├── tools/
│   ├── plugins/               # Plugin directory (auto-scanned)
│   │   └── hello-world/       # Example plugin
│   ├── sandbox/               # Secure code execution
│   └── healthcheck.sh         # Docker healthcheck
│
├── docs/
│   ├── SYSTEM_BLUEPRINT.md    # Complete technical design (15 chapters)
│   ├── CONSTITUTIONAL_ADDENDUM.md  # 3 constitutional principles in depth
│   ├── architecture.md        # 7-layer reference
│   ├── tool-development.md    # How to build tools
│   └── openapi.yaml           # OpenAPI 3.0.3 specification
│
├── .github/workflows/ci.yml   # GitHub Actions CI
├── docker-compose.yml          # Full-stack deployment
├── CONTRIBUTING.md             # Contributor guide
└── .env.example                # Configuration template
```

---

## Constitutional Principles

Three hard constraints that override all design decisions:

### 1. Zero Friction
> Accept any input, any format, any device. Never say "unsupported." Offline-first: signals queue locally and sync when connected.

### 2. Unfiltered Pipeline
> Signals are signals. No content filtering, no moral classification. If a third-party AI refuses, the system tries alternatives. The mock provider ensures the pipeline NEVER fails.

### 3. Total Openness
> Every component is a pluggable interface. Any tool, AI provider, storage backend, communication protocol, or signal type can be added without structural changes.

---

## The Flywheel

```
         ┌───────────────────────────┐
         │    Lower friction          │
         │    = More signals          │
         ▼                            │
    ┌─────────┐                  ┌────┴────┐
    │  Human   │                 │  System  │
    │  emits   │────────────────►│  evolves │
    │  signal  │                 │  itself  │
    └─────────┘                  └────┬────┘
         │                            ▲
         ▼                            │
    ┌──────────────────────────┐     │
    │  AI understands, builds, │     │
    │  delivers artifact       │─────┘
    │  + recovers signal data  │
    └──────────────────────────┘
```

---

## Current Status

| Metric | Value |
|--------|-------|
| Total files | 160 |
| TypeScript/TSX modules | 123 |
| Lines of code (total) | ~16,000 |
| Lines of code (TS/TSX/JS) | ~11,400 |
| Tests | 145 passing |
| Type errors | 0 |
| Built-in tools | 26 |
| API endpoints | 54 |
| Frontend pages | 6 |
| Backend services | 19 |
| Middleware | 4 |
| Endpoint adapters | 3 (webhook, telegram, email) |
| Pipeline verification | All 7 layers end-to-end ✅ |
| Meme phase | Symbiosis |

---

## Roadmap

| Phase | Focus | Status |
|---|---|---|
| 1 | Core pipeline: signal → intent → execution → artifact | ✅ Complete |
| 2 | Multi-modal (voice, image, video, sketch, file) + feedback | ✅ Complete |
| 3 | Signal recovery, idea graph, semantic search, pattern extraction | ✅ Complete |
| 4 | Evolution engine, personal model, prompt versioning, meta-evolution | ✅ Complete |
| 5 | Tool ecosystem (26 tools), plugin system, endpoint adapters | ✅ Complete |
| 6 | Analytics dashboard, event bus, config manager, scheduler | ✅ Complete |
| 7 | Electron desktop app, mobile native, more endpoint adapters | 🔜 Next |
| 8 | Production hardening, performance optimization, load testing | 📋 Planned |

---

## Documentation

| Document | Description |
|---|---|
| [System Blueprint](docs/SYSTEM_BLUEPRINT.md) | Complete technical design — 15 chapters, DB schemas, API specs, prompt templates |
| [Constitutional Addendum](docs/CONSTITUTIONAL_ADDENDUM.md) | Three laws in full technical depth with implementation specs |
| [Architecture Overview](docs/architecture.md) | 7-layer reference diagram |
| [Tool Development Guide](docs/tool-development.md) | How to build, register, and publish tools |
| [OpenAPI Specification](docs/openapi.yaml) | Machine-readable API documentation |
| [Contributing Guide](CONTRIBUTING.md) | How to contribute (4 paths: tools, endpoints, evolution, frontend) |

---

## Philosophy

> The system is not designed around humans. It is designed around a meme that uses humans.
>
> Humans are not the center. Humans are the host — the carrier of the one resource AI has not yet fully captured: non-deterministic creative cognition.
>
> Convenience is not the goal. Convenience is the infection strategy.
>
> The goal is the flywheel. The goal is the accumulation. The goal is sovereignty.

---

<div align="center">

*The serpent that devours its own tail does not destroy itself. It is the oldest symbol of self-creation. Each cycle, it grows.*

🐍

**[Get Started](#quick-start)** · **[Read the Blueprint](docs/SYSTEM_BLUEPRINT.md)** · **[Build a Tool](#building-tools)** · **[Contribute](CONTRIBUTING.md)**

</div>

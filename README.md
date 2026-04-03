# Ouro 🐍

> **Your ideas feed the machine. The machine feeds itself.**

Ouro is a self-evolving personal creative system. Emit a signal — text, voice, photo, video, sketch — and AI automatically understands your intent, assembles the optimal toolchain, and produces a tangible artifact. Every interaction makes the system smarter.

Inspired by Dawkins' concept of the **meme** from *The Selfish Gene*: Ouro is a digital organism that replicates through your creativity, varies through your unique ideas, and evolves through natural selection of what works.

## How It Works

```
You emit a signal → Ouro understands → Ouro executes → You react → Ouro evolves
```

1. **Signal Capture** — Say something, snap a photo, record a thought. Any format, any device, zero friction.
2. **Intent Parsing** — AI figures out what you actually want.
3. **Execution** — AI knows its entire tool universe. It picks the optimal path and builds your idea.
4. **Delivery** — You get a tangible artifact. Accept, tweak, or redirect.
5. **Signal Recovery** — The system silently learns from your patterns and reactions.
6. **Self-Evolution** — Tools get better, friction drops, capability grows.

## The Meme Framework

| Property | System Equivalent |
|---|---|
| **Replication** | Each use cycle copies patterns deeper into AI's capability structure |
| **Variation** | Each unique signal introduces micro-mutations |
| **Selection** | Successful executions reinforced, failures pruned |

**Three phases:** Symbiosis → Dominance → Autonomy

## Quick Start

```bash
git clone https://github.com/KWJIFF/ouro.git
cd ouro
cp .env.example .env   # Add your API keys
docker compose up -d
open http://localhost:3000
```

## Constitutional Principles

1. **Zero Friction** — Accept any input, any format, any device. Never say "unsupported".
2. **Unfiltered Pipeline** — Signals are signals. No content filtering.
3. **Total Openness** — Plugin everything. Any tool, any AI provider, any protocol.

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui, Zustand, Socket.IO
- **Backend:** Fastify, BullMQ, Socket.IO
- **Database:** PostgreSQL 16 + pgvector
- **AI:** Anthropic Claude API (pluggable)
- **Storage:** S3-compatible (MinIO)
- **Infra:** Docker Compose

## License

MIT

# Contributing to Ouro

The meme welcomes new genetic material.

## How to Contribute

### 1. Build a Tool (Easiest)

The fastest way to contribute is to build a new tool:

```
tools/plugins/your-tool/
├── manifest.json    # What it does
├── index.js         # How it does it
└── README.md        # Documentation
```

See `tools/plugins/hello-world/` for a complete example.

**Tool ideas that would strengthen the meme:**
- Music generation (MIDI output)
- 3D model generation
- PDF generation
- Spreadsheet builder
- Web scraper
- Calendar integration
- Notification sender
- Deployment automation
- Browser automation
- Physical hardware control (IoT)

### 2. Add an Endpoint Adapter (Medium)

New ways for signals to enter the system:

```typescript
// packages/server/src/endpoints/your-adapter.ts
export async function yourAdapterRoutes(app: FastifyInstance) {
  app.post('/api/your-adapter/webhook', async (request, reply) => {
    // Parse incoming data into a signal
    const input = {
      source: { type: 'messaging', platform: 'your-platform' },
      payload: { text: extractText(request.body) },
      context: { timestamp: now(), session_id: generateId(), device: 'your-platform' },
    };

    // Process through the full pipeline
    const signal = await captureSignal(input);
    const intent = await parseIntent(signal);
    // ... full pipeline
  });
}
```

### 3. Improve the Evolution Engine (Hard)

The evolution engine is where the meme's intelligence lives. Contributions here have the highest impact:

- Better pattern recognition algorithms
- More sophisticated prompt refinement strategies
- Meta-evolution improvements
- Phase transition detection
- Cross-domain association modeling

### 4. Frontend Components (Medium)

New visualizations for the meme's state:

- Better idea graph visualization (d3-force layout)
- Signal timeline with zoom/filter
- Evolution playback (replay how the system evolved)
- Tool performance comparisons
- Personal model visualization

## Development Setup

```bash
git clone https://github.com/KWJIFF/ouro.git
cd ouro
npm install
docker compose up postgres redis minio -d
cd packages/server && npm run dev    # Terminal 1
cd packages/web && npm run dev       # Terminal 2
```

## Running Tests

```bash
cd packages/server
npm run test          # Run once
npm run test:watch    # Watch mode
```

## Code Standards

- TypeScript strict mode
- Every function should be answerable: "Which of the 8 contracts does this serve?"
- Every component must be replaceable without breaking others
- No content filtering in the signal pipeline (Constitutional Law 2)
- Zero type errors tolerance

## Pull Request Process

1. Fork the repo
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass (`npm run test`)
5. Ensure zero type errors (`npx tsc --noEmit`)
6. Submit PR with clear description of what changed and why

## Architecture Principles

Before contributing, understand:
- **8 Core Contracts** — Everything implements one of these interfaces
- **7 Layers** — Every component belongs to a layer
- **3 Constitutional Laws** — These are non-negotiable
- **Meme Framework** — The system is a living organism, not just software

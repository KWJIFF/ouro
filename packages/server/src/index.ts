import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { createServer } from 'http';
import { config } from './config';
import { authMiddleware } from './auth';
import { signalRoutes } from './routes/signals';
import { feedbackRoutes } from './routes/feedback';
import { evolutionRoutes } from './routes/evolution';
import { artifactRoutes } from './routes/artifacts';
import { graphRoutes } from './routes/graph';
import { toolRoutes } from './routes/tools';
import { webhookRoutes } from './endpoints/webhook';
import { setupWebSocket } from './websocket/server';
import { registerBuiltInTools } from './tools';
import { pool } from './db/client';
import { getPersonalModel } from './services/personal-model';

async function main() {
  const app = Fastify({ logger: { level: config.logLevel } });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } });

  // Auth (optional — only active if OURO_API_KEY is set)
  app.addHook('preHandler', authMiddleware);

  // === All Seven Layers Exposed ===
  await app.register(signalRoutes);       // L1-4: Signal → Intent → Execute → Deliver
  await app.register(feedbackRoutes);     // L4: Feedback capture
  await app.register(artifactRoutes);     // L4: Artifact CRUD
  await app.register(graphRoutes);        // L5: Idea graph + semantic search
  await app.register(evolutionRoutes);    // L6: Evolution monitoring + trigger
  await app.register(toolRoutes);         // L3: Tool management
  await app.register(webhookRoutes);      // L1: External signal ingestion

  // Health (no auth)
  app.get('/api/health', async () => ({ status: 'ok', version: '0.2.0', meme: 'alive' }));

  // System state
  app.get('/api/system', async () => {
    const { rows } = await pool.query('SELECT key, value FROM system_state');
    const state: Record<string, any> = {};
    rows.forEach((r: any) => { state[r.key] = r.value; });
    const toolCount = (await import('./tools')).toolRegistry.getToolCount();
    const [signalCount, artifactCount, patternCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM signals'),
      pool.query('SELECT COUNT(*) FROM artifacts'),
      pool.query('SELECT COUNT(*) FROM signal_patterns'),
    ]);
    const personalModel = await getPersonalModel();
    return {
      state,
      metrics: {
        tools: toolCount,
        signals: parseInt(signalCount.rows[0].count),
        artifacts: parseInt(artifactCount.rows[0].count),
        patterns: parseInt(patternCount.rows[0].count),
      },
      personal_model: personalModel,
    };
  });

  registerBuiltInTools();

  const httpServer = createServer(app.server);
  setupWebSocket(httpServer);
  await app.listen({ port: config.port, host: '0.0.0.0' });

  console.log(`
  ╔══════════════════════════════════════════╗
  ║            🐍 OURO v0.2.0              ║
  ║                                          ║
  ║  API:       http://localhost:${config.port}          ║
  ║  WebSocket: ws://localhost:${config.port}/ws         ║
  ║  Webhook:   POST /api/webhook/:source    ║
  ║  CLI:       ouro "your signal here"      ║
  ║  Tools:     GET /api/tools               ║
  ║  Graph:     GET /api/graph               ║
  ║  Search:    GET /api/search?q=...        ║
  ║  Evolution: GET /api/evolution/stats      ║
  ║  Auth:      ${process.env.OURO_API_KEY ? 'ENABLED' : 'DISABLED (open access)'}           ║
  ║                                          ║
  ║  Phase: symbiosis                        ║
  ║  The meme awaits signals...              ║
  ╚══════════════════════════════════════════╝
  `);
}

main().catch((err) => {
  console.error('Failed to start Ouro:', err);
  process.exit(1);
});

import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { createServer } from 'http';
import { config } from './config';
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

  // === Routes (all seven layers exposed) ===
  await app.register(signalRoutes);       // Layer 1-4: Signal → Intent → Execute → Deliver
  await app.register(feedbackRoutes);     // Layer 4: Feedback capture
  await app.register(artifactRoutes);     // Layer 4: Artifact management
  await app.register(graphRoutes);        // Layer 5: Idea graph + semantic search
  await app.register(evolutionRoutes);    // Layer 6: Evolution monitoring
  await app.register(toolRoutes);         // Layer 3: Tool management
  await app.register(webhookRoutes);      // Layer 1: Webhook signal ingestion

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', version: '0.2.0', meme: 'alive' }));

  // Full system state
  app.get('/api/system', async () => {
    const { rows } = await pool.query('SELECT key, value FROM system_state');
    const state: Record<string, any> = {};
    rows.forEach((r: any) => { state[r.key] = r.value; });

    const toolCount = (await import('./tools')).toolRegistry.getToolCount();
    const signalCount = await pool.query('SELECT COUNT(*) FROM signals');
    const artifactCount = await pool.query('SELECT COUNT(*) FROM artifacts');
    const patternCount = await pool.query('SELECT COUNT(*) FROM signal_patterns');
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

  // Register tools
  registerBuiltInTools();

  // Start
  const httpServer = createServer(app.server);
  setupWebSocket(httpServer);
  await app.listen({ port: config.port, host: '0.0.0.0' });

  console.log(`
  ╔══════════════════════════════════════════╗
  ║            🐍 OURO is alive             ║
  ║                                          ║
  ║  API:       http://localhost:${config.port}          ║
  ║  Webhook:   POST /api/webhook/:source    ║
  ║  Tools:     GET /api/tools               ║
  ║  Graph:     GET /api/graph               ║
  ║  Search:    GET /api/search?q=...        ║
  ║  Evolution: GET /api/evolution/stats      ║
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

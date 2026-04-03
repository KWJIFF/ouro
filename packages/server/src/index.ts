import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { createServer } from 'http';
import { config } from './config';
import { signalRoutes } from './routes/signals';
import { feedbackRoutes } from './routes/feedback';
import { evolutionRoutes } from './routes/evolution';
import { setupWebSocket } from './websocket/server';
import { registerBuiltInTools } from './tools';
import { pool } from './db/client';

async function main() {
  const app = Fastify({
    logger: { level: config.logLevel },
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB max

  // Routes
  await app.register(signalRoutes);
  await app.register(feedbackRoutes);
  await app.register(evolutionRoutes);

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    version: '0.1.0',
    meme: 'alive',
  }));

  // System info
  app.get('/api/system', async () => {
    const { rows } = await pool.query('SELECT key, value FROM system_state');
    const state: Record<string, any> = {};
    rows.forEach((r: any) => { state[r.key] = r.value; });
    return { state, tools: (await import('./tools')).toolRegistry.getAllManifests() };
  });

  // Register built-in tools
  registerBuiltInTools();

  // Start server
  const httpServer = createServer(app.server);
  setupWebSocket(httpServer);

  await app.listen({ port: config.port, host: '0.0.0.0' });

  console.log(`
  ╔══════════════════════════════════════╗
  ║          🐍 OURO is alive           ║
  ║                                      ║
  ║  API:  http://localhost:${config.port}        ║
  ║  Phase: symbiosis                    ║
  ║  The meme awaits signals...          ║
  ╚══════════════════════════════════════╝
  `);
}

main().catch((err) => {
  console.error('Failed to start Ouro:', err);
  process.exit(1);
});

import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { createServer } from 'http';
import { config } from './config';
import { authMiddleware } from './auth';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { signalRoutes } from './routes/signals';
import { feedbackRoutes } from './routes/feedback';
import { evolutionRoutes } from './routes/evolution';
import { artifactRoutes } from './routes/artifacts';
import { graphRoutes } from './routes/graph';
import { toolRoutes } from './routes/tools';
import { observabilityRoutes } from './routes/observability';
import { webhookRoutes } from './endpoints/webhook';
import { promptRoutes } from './routes/prompts';
import { analyticsRoutes } from './routes/analytics';
import { eventRoutes } from './routes/events';
import { configRoutes } from './routes/config';
import { initConfigManager } from './services/config-manager';
import { initScheduler } from './services/scheduler';
import { initCache } from './services/cache';
import { cacheRoutes } from './routes/cache';
import { healthRoutes } from './routes/health';
import { telemetryRoutes } from './routes/telemetry';
import { replayRoutes } from './routes/replay';
import { initShutdownHandler } from './services/shutdown';
import { printEnvReport } from './services/env-validator';
import { schedulerRoutes } from './routes/scheduler';
import { eventBus, wireEventBusToWebSocket } from './services/event-bus';
import { initPromptManager } from './ai/prompts/prompt-manager';
import { telegramRoutes } from './endpoints/telegram';
import { emailRoutes } from './endpoints/email';
import { setupWebSocket } from './websocket/server';
import { registerBuiltInTools } from './tools';
import { pool } from './db/client';
import { getPersonalModel } from './services/personal-model';

async function main() {
  const app = Fastify({ logger: { level: config.logLevel } });

  // Global middleware
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } });
  app.addHook('preHandler', authMiddleware);
  app.addHook('onRequest', requestLogger);
  app.setErrorHandler(errorHandler);

  // === Layer Routes ===
  await app.register(signalRoutes);          // L1-4
  await app.register(feedbackRoutes);        // L4
  await app.register(artifactRoutes);        // L4
  await app.register(graphRoutes);           // L5
  await app.register(evolutionRoutes);       // L6
  await app.register(toolRoutes);            // L3
  await app.register(observabilityRoutes);   // Admin

  // === Endpoint Adapters ===
  await app.register(webhookRoutes);         // Generic webhook
  await app.register(telegramRoutes);        // Telegram bot
  await app.register(emailRoutes);
  await app.register(promptRoutes);
  await app.register(analyticsRoutes);
  await app.register(eventRoutes);           // Event stream
  await app.register(configRoutes);
  await app.register(schedulerRoutes);
  await app.register(cacheRoutes);
  await app.register(healthRoutes);
  await app.register(telemetryRoutes);
  await app.register(replayRoutes);            // Signal replay        // Telemetry dashboard           // Detailed health + rate limits            // Cache admin       // Task scheduler admin          // Dynamic config       // Analytics dashboard          // Prompt management           // Email inbound

  // Health + System
  app.get('/api/health', async () => ({ status: 'ok', version: '0.3.0', meme: 'alive', uptime: process.uptime() }));
  app.get('/api/system', async () => {
    const { rows } = await pool.query('SELECT key, value FROM system_state');
    const state: Record<string, any> = {};
    rows.forEach((r: any) => { state[r.key] = r.value; });
    const toolCount = (await import('./tools')).toolRegistry.getToolCount();
    const [sc, ac, pc] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM signals'),
      pool.query('SELECT COUNT(*) FROM artifacts'),
      pool.query('SELECT COUNT(*) FROM signal_patterns'),
    ]);
    return {
      state,
      metrics: { tools: toolCount, signals: parseInt(sc.rows[0].count), artifacts: parseInt(ac.rows[0].count), patterns: parseInt(pc.rows[0].count) },
      personal_model: await getPersonalModel(),
    };
  });

  registerBuiltInTools();
  await initPromptManager();
  await initConfigManager();
  wireEventBusToWebSocket();
  printEnvReport();
  initShutdownHandler();
  initCache().catch(() => {});
  initScheduler();
  const httpServer = createServer(app.server);
  setupWebSocket(httpServer);
  await app.listen({ port: config.port, host: '0.0.0.0' });

  console.log(`
  ╔══════════════════════════════════════════════╗
  ║              🐍 OURO v0.3.0                 ║
  ║                                              ║
  ║  API:       http://localhost:${config.port}              ║
  ║  WebSocket: ws://localhost:${config.port}/ws             ║
  ║  Telegram:  POST /api/telegram/webhook       ║
  ║  Email:     POST /api/email/inbound          ║
  ║  Webhook:   POST /api/webhook/:source        ║
  ║  CLI:       ouro "your signal here"          ║
  ║  Admin:     GET /api/admin/stats             ║
  ║  16 built-in tools registered                ║
  ║  Phase: symbiosis                            ║
  ╚══════════════════════════════════════════════╝
  `);
}

main().catch(err => { console.error('Failed to start Ouro:', err); process.exit(1); });

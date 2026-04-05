import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';

import { pool, query, getOne, getMany } from './db/client';

import { registerBuiltInTools } from './tools';
import { toolRegistry } from './tools/registry';

import { captureSignal } from './services/signal-capture';
import { parseIntent } from './services/intent-parser';
import { generatePlan } from './services/execution-planner';
import { executePlan } from './services/execution-runner';
import { buildArtifacts } from './services/artifact-builder';

import { semanticSearch } from './services/semantic-search';
import { getIdeaGraph, createConnection } from './services/idea-graph';
import { processFeedback } from './services/feedback-processor';
import { runEvolutionCycle } from './services/evolution-engine';
import { buildPersonalModel } from './services/personal-model';

import { validate, SignalSubmitSchema, FeedbackSubmitSchema, SearchSchema, ConnectionCreateSchema } from './middleware/validation';
import { formatSuccess, formatError, ErrorCodes } from './middleware/response-formatter';
import { checkRateLimit, RATE_LIMITS } from './middleware/user-rate-limiter';
import { pipelineHooks } from './middleware/pipeline-hooks';
import { telemetry } from './services/telemetry';

import { enrichSignalContext } from './services/context-enricher';
import { checkDuplicate } from './services/signal-dedup';
import { getHealthReport } from './services/health-monitor';
import { exportSignals } from './services/data-export';
import { replaySignals } from './services/signal-replay';
import { getFullAnalytics } from './services/analytics';
import { cache, initCache } from './services/cache';

import { generateId, now } from '@ouro/core';

async function main() {
  registerBuiltInTools();
  
  const app = Fastify({ logger: false });
  await app.register(fastifyCors, { origin: true });
  
  app.get('/api/health', async () => ({ status: 'ok', tools: toolRegistry.getToolCount() }));
  
  app.post('/api/signals', async (req, reply) => {
    const t = Date.now();
    const v = validate(SignalSubmitSchema, req.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid', t, { details: v.errors }));
    
    const input = v.data!;
    const signal = await captureSignal({
      source: { type: 'api' },
      payload: { text: input.text, files: [], urls: [], metadata: {} },
      context: { timestamp: now(), session_id: generateId(), device: 'api' },
    });
    const intent = await parseIntent(signal);
    if (intent.needs_clarification) {
      return reply.send(formatSuccess({ signal_id: signal.id, needs_clarification: true, question: intent.clarification_question }, t));
    }
    const plan = await generatePlan(intent);
    const executed = await executePlan(plan, signal.id);
    const artifacts = await buildArtifacts(executed, signal.id, intent.description);
    
    return reply.send(formatSuccess({
      signal_id: signal.id,
      intent: { type: intent.intent_type, confidence: intent.confidence, description: intent.description },
      artifacts: artifacts.map(a => ({ id: a.id, type: a.artifact_type, title: a.title, content: a.metadata?.inline_content || a.description })),
    }, t));
  });
  
  app.get('/api/admin/stats', async () => {
    const [s,a,p] = await Promise.all([
      getOne<any>('SELECT COUNT(*) as c FROM signals'),
      getOne<any>('SELECT COUNT(*) as c FROM artifacts'),
      getOne<any>('SELECT COUNT(*) as c FROM signal_patterns'),
    ]);
    return formatSuccess({ signals: +(s?.c||0), artifacts: +(a?.c||0), patterns: +(p?.c||0), tools: toolRegistry.getToolCount() }, Date.now());
  });
  
  app.get('/api/tools', async () => formatSuccess({ tools: toolRegistry.getAllManifests(), count: toolRegistry.getToolCount() }, Date.now()));
  app.get('/api/evolution/stats', async () => {
    const model = await buildPersonalModel();
    return formatSuccess({ phase: 'symbiosis', model }, Date.now());
  });

  // Signal list
  app.get('/api/signals', async (req) => {
    const { page = 1, pageSize = 20 } = req.query as any;
    const offset = ((+page) - 1) * (+pageSize);
    const rows = await getMany('SELECT s.*, i.intent_type, i.confidence FROM signals s LEFT JOIN intents i ON i.signal_id = s.id ORDER BY s.created_at DESC LIMIT $1 OFFSET $2', [+pageSize, offset]);
    const cnt = await getOne<any>('SELECT COUNT(*) as c FROM signals');
    return formatSuccess({ signals: rows, total: +(cnt?.c||0), page: +page, pageSize: +pageSize }, Date.now());
  });

  // Signal detail
  app.get('/api/signals/:id', async (req, reply) => {
    const { id } = req.params as any;
    const signal = await getOne('SELECT * FROM signals WHERE id = $1', [id]);
    if (!signal) return reply.code(404).send(formatError(ErrorCodes.SIGNAL_NOT_FOUND, 'Not found', Date.now()));
    const [intent, artifacts, feedback] = await Promise.all([
      getOne('SELECT * FROM intents WHERE signal_id = $1', [id]),
      getMany('SELECT * FROM artifacts WHERE signal_id = $1', [id]),
      getMany('SELECT * FROM feedback WHERE signal_id = $1', [id]),
    ]);
    return formatSuccess({ signal, intent, artifacts, feedback }, Date.now());
  });

  // Search
  app.get('/api/search', async (req, reply) => {
    const v = validate(SearchSchema, req.query);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid', Date.now(), { details: v.errors }));
    const results = await semanticSearch(v.data!.q, v.data!.limit);
    return formatSuccess({ results, query: v.data!.q }, Date.now());
  });

  // Feedback
  app.post('/api/feedback', async (req, reply) => {
    const v = validate(FeedbackSubmitSchema, req.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid', Date.now(), { details: v.errors }));
    const fb = await processFeedback(v.data! as any);
    return formatSuccess(fb, Date.now());
  });

  // Graph
  app.get('/api/graph', async () => formatSuccess(await getIdeaGraph(), Date.now()));
  app.post('/api/connections', async (req, reply) => {
    const v = validate(ConnectionCreateSchema, req.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid', Date.now(), { details: v.errors }));
    const d = v.data!;
    return formatSuccess(await createConnection(d.source_signal_id, d.target_signal_id, d.connection_type || 'manual', d.strength || 0.8), Date.now());
  });

  // Evolution trigger + log
  app.post('/api/evolution/trigger', async () => {
    const events = await runEvolutionCycle();
    return formatSuccess({ events_generated: events.length, events }, Date.now());
  });
  app.get('/api/evolution/log', async () => formatSuccess({ events: await getMany('SELECT * FROM evolution_events ORDER BY created_at DESC LIMIT 50') }, Date.now()));

  // Analytics
  app.get('/api/analytics', async () => formatSuccess(await getFullAnalytics(), Date.now()));

  // Webhook
  app.post('/api/webhook/:source', async (req) => {
    const { source } = req.params as any;
    const body = req.body as any;
    const text = body?.text || body?.message || JSON.stringify(body).slice(0, 500);
    const signal = await captureSignal({
      source: { type: 'webhook' as any }, payload: { text, files: [], urls: [], metadata: {} },
      context: { timestamp: now(), session_id: generateId(), device: `webhook:${source}` },
    });
    return formatSuccess({ signal_id: signal.id, source }, Date.now());
  });

  // System info
  app.get('/api/system', async () => ({
    version: '0.3.0', phase: 'symbiosis', uptime: Math.round(process.uptime()),
    tools: toolRegistry.getToolCount(),
  }));

  // Graceful shutdown
  const shutdown = async (sig: string) => {
    console.log(`\n[Ouro] ${sig}. Shutting down...`);
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Listen
  const port = parseInt(process.env.PORT || '3001');
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`\n🐍 Ouro is alive on http://localhost:${port}`);
  console.log(`   ${toolRegistry.getToolCount()} tools | Phase: symbiosis`);
  console.log(`   The meme is listening.\n`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });

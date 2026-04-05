import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { pool } from './db/client';
import { registerBuiltInTools } from './tools';
import { eventBus } from './services/event-bus';
import { initCache } from './services/cache';
import { initScheduler } from './services/scheduler';
import { initWebhookVerification } from './middleware/webhook-verify';
import { telemetry } from './services/telemetry';
import { pipelineHooks } from './middleware/pipeline-hooks';
import { validate, SignalSubmitSchema, FeedbackSubmitSchema, SearchSchema, ToolRegisterSchema, ToolGenerateSchema, ConfigUpdateSchema, ConnectionCreateSchema, SignalClarifySchema, ReplaySchema } from './middleware/validation';
import { checkRateLimit, RATE_LIMITS, getRateLimitStats } from './middleware/user-rate-limiter';
import { formatSuccess, formatError, formatPaginated, ErrorCodes } from './middleware/response-formatter';

// Services
import { captureSignal, getRecentSignals } from './services/signal-capture';
import { parseIntent } from './services/intent-parser';
import { generatePlan } from './services/execution-planner';
import { executePlan } from './services/execution-runner';
import { buildArtifacts } from './services/artifact-builder';
import { extractPatterns } from './services/pattern-extractor';
import { processFeedback } from './services/feedback-processor';
import { semanticSearch } from './services/semantic-search';
import { getIdeaGraph, createConnection } from './services/idea-graph';
import { runEvolutionCycle } from './services/evolution-engine';
import { buildPersonalModel } from './services/personal-model';
import { enrichSignalContext } from './services/context-enricher';
import { checkDuplicate } from './services/signal-dedup';
import { getHealthReport } from './services/health-monitor';
import { exportSignals, importSignals } from './services/data-export';
import { replaySignals } from './services/signal-replay';
import { getFullAnalytics } from './services/analytics';
import { toolRegistry } from './tools/registry';
import { cache } from './services/cache';
import { query, getOne, getMany } from './db/client';
import { generateId, now } from '@ouro/core';

const PORT = parseInt(process.env.PORT || '3001');

async function start() {
  const app = Fastify({ logger: false });

  // ===== CORS =====
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ===== Request Logging =====
  app.addHook('onRequest', async (request) => {
    (request as any)._startTime = Date.now();
    telemetry.increment('requests.total');
    telemetry.increment(`requests.method.${request.method.toLowerCase()}`);
  });

  app.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - ((request as any)._startTime || Date.now());
    telemetry.record('requests.duration_ms', duration);
    if (reply.statusCode >= 400) telemetry.increment('requests.errors');
  });

  // ===== Rate Limit Helper =====
  function rateLimit(type: keyof typeof RATE_LIMITS) {
    return async (request: any, reply: any) => {
      const userId = request.headers['x-user-id'] as string || request.ip || 'anonymous';
      const result = checkRateLimit(userId, RATE_LIMITS[type]);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', Math.ceil(result.resetMs / 1000));
      if (!result.allowed) {
        return reply.code(429).send(formatError(
          ErrorCodes.RATE_LIMITED, 'Rate limit exceeded', (request as any)._startTime,
          { details: { retry_after_ms: result.resetMs } }
        ));
      }
    };
  }

  // ===== Register Tools =====
  registerBuiltInTools();

  // ===== Init Services =====
  await initCache().catch(() => console.log('[Cache] Redis not available, using memory only'));
  initWebhookVerification();

  // ================================================================
  // ROUTES — THE CORE API
  // ================================================================

  // ----- Health -----
  app.get('/api/health', async (request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health/detailed', async (request, reply) => {
    const report = await getHealthReport();
    return reply.code(report.status === 'unhealthy' ? 503 : 200).send(report);
  });

  // ----- THE CORE ENDPOINT: Signal Submission -----
  app.post('/api/signals', { preHandler: rateLimit('signal') }, async (request, reply) => {
    const start = Date.now();
    const validation = validate(SignalSubmitSchema, request.body);
    if (!validation.success) {
      return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid signal', start, { details: validation.errors }));
    }

    try {
      const input = validation.data!;

      // L0: Dedup check
      const dedup = await checkDuplicate(input.text);
      if (dedup.isDuplicate && dedup.action === 'merge') {
        return reply.send(formatSuccess({ signal_id: dedup.duplicateOf, deduplicated: true, action: 'merge' }, start));
      }

      // L1: Capture
      await pipelineHooks.run('beforeCapture', { signalId: '', data: input, metadata: {} });
      const signal = await captureSignal({
        source: { type: 'api' },
        payload: { text: input.text, files: [], urls: [], metadata: { modality: input.modality } },
        context: { timestamp: now(), session_id: input.context?.session_id || generateId(), device: input.context?.device || 'api' },
      });
      telemetry.signalCaptured(input.modality || 'text');
      await pipelineHooks.run('afterCapture', { signalId: signal.id, data: signal, metadata: {} });
      eventBus.emit('signal:captured' as any, { signal_id: signal.id });

      // L1.5: Context enrichment
      const enrichedContext = await enrichSignalContext(signal);

      // L2: Parse intent
      await pipelineHooks.run('beforeParse', { signalId: signal.id, data: signal, metadata: {} });
      const intentStart = Date.now();
      const intent = await parseIntent(signal);
      telemetry.intentParsed(intent.intent_type, Date.now() - intentStart);
      await pipelineHooks.run('afterParse', { signalId: signal.id, data: intent, metadata: {} });
      eventBus.emit('signal:parsed' as any, { signal_id: signal.id, intent });

      // L2.5: Clarification check
      if (intent.needs_clarification) {
        return reply.send(formatSuccess({
          signal_id: signal.id,
          needs_clarification: true,
          question: intent.clarification_question,
          intent: { type: intent.intent_type, confidence: intent.confidence },
        }, start));
      }

      // L3: Plan + Execute
      await pipelineHooks.run('beforePlan', { signalId: signal.id, data: intent, metadata: {} });
      const plan = await generatePlan(intent);
      await pipelineHooks.run('afterPlan', { signalId: signal.id, data: plan, metadata: {} });
      eventBus.emit('execution:planned' as any, { signal_id: signal.id, steps: plan.steps.length });

      await pipelineHooks.run('beforeExecute', { signalId: signal.id, data: plan, metadata: {} });
      const executed = await executePlan(plan, signal.id);
      await pipelineHooks.run('afterExecute', { signalId: signal.id, data: executed, metadata: {} });

      // L4: Build artifacts
      await pipelineHooks.run('beforeDeliver', { signalId: signal.id, data: executed, metadata: {} });
      const artifacts = await buildArtifacts(executed, signal.id, intent.description);
      await pipelineHooks.run('afterDeliver', { signalId: signal.id, data: artifacts, metadata: {} });
      eventBus.emit('signal:completed' as any, { signal_id: signal.id, artifacts: artifacts.length });

      // Track tool execution telemetry
      for (const step of executed.steps) {
        telemetry.toolExecuted(step.tool, step.status === 'completed', ((step as any).duration_ms || 0) || 0);
      }
      for (const art of artifacts) {
        telemetry.artifactBuilt(art.artifact_type);
      }

      // L5: Pattern recovery (async, don't block response)
      extractPatterns(signal, intent, executed, [] as any).catch(e =>
        console.error('[Pipeline] Pattern extraction error:', e.message)
      );

      // Cache successful execution path
      const pathKey = `${intent.intent_type}:${intent.parameters?.domain || 'general'}`;
      cache.set(`path:${pathKey}`, {
        dag: { steps: plan.steps.map(s => ({ tool: s.tool })) },
        satisfaction: 0.8,
      }, 3600000).catch(() => {});

      return reply.send(formatSuccess({
        signal_id: signal.id,
        intent: {
          type: intent.intent_type,
          confidence: intent.confidence,
          description: intent.description,
        },
        plan: {
          id: plan.id,
          steps: plan.steps.map(s => ({ tool: s.tool, status: s.status })),
        },
        artifacts: artifacts.map(a => ({
          id: a.id,
          type: a.artifact_type,
          title: a.title,
          content: a.metadata?.inline_content || a.description,
          metadata: a.metadata,
          version: a.version,
        })),
        patterns_extracted: 'async',
        dedup: dedup.action !== 'create' ? { action: dedup.action, similarity: dedup.similarity, related: dedup.relatedSignals } : undefined,
        context: {
          session: enrichedContext.session.signalCount,
          phase: enrichedContext.evolution.phase,
        },
      }, start));

    } catch (error: any) {
      telemetry.pipelineError(0, error.message?.slice(0, 50));
      return reply.code(500).send(formatError(ErrorCodes.INTERNAL_ERROR, error.message, start));
    }
  });

  // ----- Signal List -----
  app.get('/api/signals', async (request, reply) => {
    const start = Date.now();
    const { page = 1, pageSize = 20 } = request.query as any;
    const offset = (page - 1) * pageSize;
    const [rows, countResult] = await Promise.all([
      getMany('SELECT s.*, i.intent_type, i.confidence FROM signals s LEFT JOIN intents i ON i.signal_id = s.id ORDER BY s.created_at DESC LIMIT $1 OFFSET $2', [pageSize, offset]),
      getOne<any>('SELECT COUNT(*) as c FROM signals'),
    ]);
    return reply.send(formatPaginated(rows, parseInt(countResult?.c || '0'), page, pageSize, start));
  });

  // ----- Signal Detail -----
  app.get('/api/signals/:id', async (request, reply) => {
    const start = Date.now();
    const { id } = request.params as any;
    const signal = await getOne('SELECT * FROM signals WHERE id = $1', [id]);
    if (!signal) return reply.code(404).send(formatError(ErrorCodes.SIGNAL_NOT_FOUND, 'Signal not found', start));
    const intent = await getOne('SELECT * FROM intents WHERE signal_id = $1', [id]);
    const plan = await getOne('SELECT * FROM execution_plans WHERE signal_id = $1', [id]);
    const artifacts = await getMany('SELECT * FROM artifacts WHERE signal_id = $1', [id]);
    const feedback = await getMany('SELECT * FROM feedback WHERE signal_id = $1', [id]);
    return reply.send(formatSuccess({ signal, intent, plan, artifacts, feedback }, start));
  });

  // ----- Clarify -----
  app.post('/api/signals/:id/clarify', async (request, reply) => {
    const start = Date.now();
    const v = validate(SignalClarifySchema, request.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid', start, { details: v.errors }));
    return reply.send(formatSuccess({ acknowledged: true }, start));
  });

  // ----- Similar Signals -----
  app.get('/api/signals/:id/similar', async (request, reply) => {
    const start = Date.now();
    const { id } = request.params as any;
    const signal = await getOne<any>('SELECT normalized_text FROM signals WHERE id = $1', [id]);
    if (!signal) return reply.code(404).send(formatError(ErrorCodes.SIGNAL_NOT_FOUND, 'Signal not found', start));
    const results = await semanticSearch(signal.normalized_text, 5);
    return reply.send(formatSuccess({ similar: results.filter((r: any) => r.id !== id) }, start));
  });

  // ----- Feedback -----
  app.post('/api/feedback', { preHandler: rateLimit('feedback') }, async (request, reply) => {
    const start = Date.now();
    const v = validate(FeedbackSubmitSchema, request.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid feedback', start, { details: v.errors }));
    const fb = await processFeedback(v.data! as any);
    telemetry.feedbackReceived(v.data!.action, v.data!.satisfaction_score || 0.5);
    return reply.send(formatSuccess(fb, start));
  });

  // ----- Search -----
  app.get('/api/search', { preHandler: rateLimit('search') }, async (request, reply) => {
    const start = Date.now();
    const v = validate(SearchSchema, request.query);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid search', start, { details: v.errors }));
    const results = await semanticSearch(v.data!.q, v.data!.limit);
    return reply.send(formatSuccess({ results, query: v.data!.q }, start));
  });

  // ----- Idea Graph -----
  app.get('/api/graph', async (request, reply) => {
    const start = Date.now();
    const graph = await getIdeaGraph();
    return reply.send(formatSuccess(graph, start));
  });

  app.post('/api/connections', async (request, reply) => {
    const start = Date.now();
    const v = validate(ConnectionCreateSchema, request.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid', start, { details: v.errors }));
    const conn = await createConnection(v.data!.source_signal_id, v.data!.target_signal_id, v.data!.connection_type || "manual", v.data!.strength || 0.8);
    return reply.send(formatSuccess(conn, start));
  });

  // ----- Evolution -----
  app.get('/api/evolution/stats', async (request, reply) => {
    const start = Date.now();
    const [phase, cycles, model] = await Promise.all([
      getOne<any>("SELECT value FROM system_state WHERE key = 'meme_phase'"),
      getOne<any>("SELECT value FROM system_state WHERE key = 'evolution_cycle_count'"),
      buildPersonalModel(),
    ]);
    return reply.send(formatSuccess({
      phase: phase?.value || 'symbiosis',
      cycle_count: cycles?.value || 0,
      model_confidence: model.evolution_readiness.model_confidence,
      total_signals: (model as any).total_signals || 0,
      personal_model: {
        top_domains: Object.entries(model.domain_preferences).sort(([,a]: any,[,b]: any) => b-a).slice(0,5).map(([d])=>d),
        preferred_modality: Object.entries(model.modality_preferences || {}).sort(([,a]: any,[,b]: any) => b-a)?.[0]?.[0] || 'text',
        abstraction: model.expression_profile?.preferred_abstraction || 'medium',
        peak_hours: model.temporal_profile?.peak_hours || [],
      },
    }, start));
  });

  app.get('/api/evolution/log', async (request, reply) => {
    const start = Date.now();
    const events = await getMany('SELECT * FROM evolution_events ORDER BY created_at DESC LIMIT 50');
    return reply.send(formatSuccess({ events }, start));
  });

  app.post('/api/evolution/trigger', { preHandler: rateLimit('evolution') }, async (request, reply) => {
    const start = Date.now();
    const evoStart = Date.now();
    const events = await runEvolutionCycle();
    telemetry.evolutionRan(events.length, Date.now() - evoStart);
    return reply.send(formatSuccess({ events_generated: events.length, events }, start));
  });

  // ----- Analytics -----
  app.get('/api/analytics', async (request, reply) => {
    const start = Date.now();
    const data = await getFullAnalytics();
    return reply.send(formatSuccess(data, start));
  });

  // ----- Tools -----
  app.get('/api/tools', async (request, reply) => {
    const start = Date.now();
    return reply.send(formatSuccess({ tools: toolRegistry.getAllManifests(), count: toolRegistry.getToolCount() }, start));
  });

  app.post('/api/tools/register', { preHandler: rateLimit('tools') }, async (request, reply) => {
    const start = Date.now();
    const v = validate(ToolRegisterSchema, request.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid manifest', start, { details: v.errors }));
    return reply.send(formatSuccess({ registered: true, id: v.data!.id }, start));
  });

  app.post('/api/tools/generate', { preHandler: rateLimit('tools') }, async (request, reply) => {
    const start = Date.now();
    const v = validate(ToolGenerateSchema, request.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid', start, { details: v.errors }));
    return reply.send(formatSuccess({ message: 'Tool generation queued', description: v.data!.description }, start));
  });

  // ----- Config -----
  app.get('/api/config', async (request, reply) => {
    const start = Date.now();
    const rows = await getMany('SELECT * FROM ouro_config ORDER BY key');
    return reply.send(formatSuccess({ config: rows }, start));
  });

  app.get('/api/config/:key', async (request, reply) => {
    const start = Date.now();
    const { key } = request.params as any;
    const row = await getOne('SELECT * FROM ouro_config WHERE key = $1', [key]);
    if (!row) return reply.code(404).send(formatError('CONFIG_NOT_FOUND', `Config key '${key}' not found`, start));
    return reply.send(formatSuccess(row, start));
  });

  app.put('/api/config/:key', { preHandler: rateLimit('admin') }, async (request, reply) => {
    const start = Date.now();
    const { key } = request.params as any;
    const v = validate(ConfigUpdateSchema, request.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid', start, { details: v.errors }));
    await query(
      `INSERT INTO ouro_config (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW(), version = ouro_config.version + 1`,
      [key, JSON.stringify(v.data!.value)]
    );
    return reply.send(formatSuccess({ key, value: v.data!.value }, start));
  });

  // ----- Events -----
  app.get('/api/events', async (request, reply) => {
    const start = Date.now();
    return reply.send(formatSuccess({ events: eventBus.getRecentEvents(50), rate: eventBus.getEventRate(60000) }, start));
  });

  app.get('/api/events/stream', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const handler = (event: any) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    eventBus.on('*' as any, handler);
    request.raw.on('close', () => eventBus.off('*' as any, handler));
  });

  // ----- Webhooks -----
  app.post('/api/webhook/:source', { preHandler: rateLimit('webhook') }, async (request, reply) => {
    const start = Date.now();
    const { source } = request.params as any;
    const body = request.body as any;
    const text = body?.text || body?.message || body?.content || JSON.stringify(body).slice(0, 500);
    const signal = await captureSignal({
      source: { type: 'webhook' as any },
      payload: { text, files: [], urls: [], metadata: {} },
      context: { timestamp: now(), session_id: generateId(), device: `webhook:${source}` },
    });
    return reply.send(formatSuccess({ signal_id: signal.id, source }, start));
  });

  // ----- Admin -----
  app.get('/api/admin/stats', async (request, reply) => {
    const start = Date.now();
    const stats = await Promise.all([
      getOne<any>('SELECT COUNT(*) as c FROM signals'),
      getOne<any>('SELECT COUNT(*) as c FROM artifacts'),
      getOne<any>('SELECT COUNT(*) as c FROM signal_patterns'),
      getOne<any>('SELECT COUNT(*) as c FROM feedback'),
      getOne<any>('SELECT COUNT(*) as c FROM evolution_events'),
    ]);
    return reply.send(formatSuccess({
      signals: parseInt(stats[0]?.c || '0'),
      artifacts: parseInt(stats[1]?.c || '0'),
      patterns: parseInt(stats[2]?.c || '0'),
      feedback: parseInt(stats[3]?.c || '0'),
      evolution_events: parseInt(stats[4]?.c || '0'),
      uptime_seconds: Math.round(process.uptime()),
      tools: toolRegistry.getToolCount(),
    }, start));
  });

  app.get('/api/admin/telemetry', async (request, reply) => {
    return reply.send(telemetry.getReport());
  });

  app.get('/api/admin/cache', async (request, reply) => {
    return reply.send(cache.getStats());
  });

  app.post('/api/admin/cache/clear', { preHandler: rateLimit('admin') }, async (request, reply) => {
    await cache.invalidatePattern('');
    return reply.send({ status: 'cleared' });
  });

  app.get('/api/admin/rate-limits', async (request, reply) => {
    return reply.send(getRateLimitStats());
  });

  app.get('/api/admin/hooks', async (request, reply) => {
    return reply.send({ hooks: pipelineHooks.getRegistered() });
  });

  app.post('/api/admin/replay', { preHandler: rateLimit('admin') }, async (request, reply) => {
    const start = Date.now();
    const v = validate(ReplaySchema, request.body);
    if (!v.success) return reply.code(400).send(formatError(ErrorCodes.VALIDATION_ERROR, 'Invalid', start, { details: v.errors }));
    const result = await replaySignals(v.data!);
    return reply.send(formatSuccess(result, start));
  });

  app.get('/api/admin/export', async (request, reply) => {
    const start = Date.now();
    const { format, from, to, include_artifacts, include_patterns, anonymize } = request.query as any;
    const data = await exportSignals({
      format: format || 'json',
      dateRange: from && to ? { from, to } : undefined,
      includeArtifacts: include_artifacts === 'true',
      includePatterns: include_patterns === 'true',
      anonymize: anonymize === 'true',
    });
    if (format === 'csv') reply.header('Content-Type', 'text/csv');
    else if (format === 'markdown') reply.header('Content-Type', 'text/markdown');
    return reply.send(data);
  });

  app.post('/api/admin/import', { preHandler: rateLimit('admin') }, async (request, reply) => {
    const start = Date.now();
    const body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    const result = await importSignals(body);
    return reply.send(formatSuccess(result, start));
  });

  // ----- System -----
  app.get('/api/system', async (request, reply) => {
    const start = Date.now();
    return reply.send(formatSuccess({
      version: '0.3.0',
      phase: (await getOne<any>("SELECT value FROM system_state WHERE key = 'meme_phase'"))?.value || 'symbiosis',
      uptime_seconds: Math.round(process.uptime()),
      tools: toolRegistry.getToolCount(),
      events: eventBus.getEventCounts(),
    }, start));
  });

  // ===== Graceful Shutdown =====
  const shutdown = async (signal: string) => {
    console.log(`\n[Ouro] ${signal} received. Shutting down gracefully...`);
    try {
      await app.close();
      await pool.end();
      console.log('[Ouro] Goodbye. The meme sleeps.');
    } catch (e) {
      console.error('[Ouro] Shutdown error:', e);
    }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ===== Start =====
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🐍 Ouro is alive.`);
    console.log(`   API: http://localhost:${PORT}`);
    console.log(`   Tools: ${toolRegistry.getToolCount()} registered`);
    console.log(`   Events: ${Object.keys(eventBus.getEventCounts()).length} types`);
    console.log(`   Phase: symbiosis`);
    console.log(`   The meme is listening.\n`);
  } catch (err) {
    console.error('[Ouro] Failed to start:', err);
    process.exit(1);
  }
}

start();

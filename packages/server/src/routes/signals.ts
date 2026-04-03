import type { FastifyInstance } from 'fastify';
import { generateId, now } from '@ouro/core';
import type { FilePayload } from '@ouro/core';
import { captureSignal, getSignal, getRecentSignals, updateSignalStatus, findSimilarSignals } from '../services/signal-capture';
import { parseIntent } from '../services/intent-parser';
import { generatePlan } from '../services/execution-planner';
import { executePlan } from '../services/execution-runner';
import { buildArtifacts } from '../services/artifact-builder';
import { runRecoveryWorker } from '../queue/workers/recovery-worker';
import { runEvolutionWorker } from '../queue/workers/evolution-worker';
import { emitSignalParsed, emitExecutionPlanned, emitExecutionCompleted } from '../websocket/server';
import { query, getMany } from '../db/client';

export async function signalRoutes(app: FastifyInstance) {

  // ===== POST /api/signals — THE core endpoint =====
  app.post('/api/signals', async (request, reply) => {
    let text = '';
    let files: FilePayload[] = [];
    let urls: string[] = [];
    let contextData: Record<string, any> = {};

    const contentType = request.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk);
          files.push({
            filename: part.filename || 'unnamed',
            mime_type: part.mimetype || 'application/octet-stream',
            size_bytes: Buffer.concat(chunks).length,
            buffer: Buffer.concat(chunks),
          });
        } else {
          const value = part.value as string;
          if (['text', 'content', 'signal'].includes(part.fieldname)) text = value;
          else if (part.fieldname === 'urls') try { urls = JSON.parse(value); } catch {}
          else if (part.fieldname === 'context') try { contextData = JSON.parse(value); } catch {}
        }
      }
    } else {
      const body = request.body as any || {};
      text = body.text || body.content || body.signal || '';
      urls = body.urls || [];
      contextData = body.context || {};
    }

    const input = {
      source: { type: 'api' as const },
      payload: { text, files, urls, metadata: {} },
      context: {
        timestamp: now(),
        session_id: contextData.session_id || generateId(),
        device: contextData.device || (request.headers['user-agent'] || 'unknown').slice(0, 100),
        ...contextData,
      },
    };

    try {
      // === LAYER 1: Signal Capture ===
      const signal = await captureSignal(input);

      // === LAYER 2: Intent Parsing ===
      const intent = await parseIntent(signal);
      await updateSignalStatus(signal.id, 'parsed');
      emitSignalParsed(signal.id, intent);

      if (intent.needs_clarification) {
        return reply.code(200).send({
          signal_id: signal.id,
          intent_id: intent.id,
          status: 'needs_clarification',
          question: intent.clarification_question,
        });
      }

      // === LAYER 3: Execution Planning + Running ===
      await updateSignalStatus(signal.id, 'executing');
      const plan = await generatePlan(intent);
      emitExecutionPlanned(signal.id, { plan_id: plan.id, steps: plan.steps.length });

      const executedPlan = await executePlan(plan, signal.id);

      // === LAYER 4: Artifact Building ===
      const artifacts = await buildArtifacts(executedPlan, signal.id, intent.description);

      const finalStatus = executedPlan.status === 'completed' ? 'completed' : 'failed';
      await updateSignalStatus(signal.id, finalStatus);
      emitExecutionCompleted(signal.id, executedPlan, artifacts);

      // === LAYER 5+6: Recovery + Evolution (async, non-blocking) ===
      setImmediate(async () => {
        try {
          await runRecoveryWorker(signal.id);
          await runEvolutionWorker();
        } catch (e) {
          console.error('[Background] Recovery/Evolution failed:', e);
        }
      });

      return reply.code(201).send({
        signal_id: signal.id,
        intent: { type: intent.intent_type, description: intent.description, confidence: intent.confidence },
        execution: {
          plan_id: plan.id,
          status: executedPlan.status,
          steps: executedPlan.steps.map(s => ({ id: s.id, tool: s.tool, status: s.status })),
        },
        artifacts: artifacts.map(a => ({
          id: a.id,
          type: a.artifact_type,
          title: a.title,
          content: a.metadata?.inline_content,
          metadata: a.metadata,
          version: a.version,
        })),
      });
    } catch (error: any) {
      console.error('[Signal] Processing error:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // Clarify
  app.post('/api/signals/:id/clarify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { answer } = request.body as { answer: string };
    const signal = await getSignal(id);
    if (!signal) return reply.code(404).send({ error: 'Signal not found' });

    signal.normalized_text += `\n[Clarification: ${answer}]`;
    const intent = await parseIntent(signal);
    const plan = await generatePlan(intent);
    const executedPlan = await executePlan(plan, signal.id);
    const artifacts = await buildArtifacts(executedPlan, signal.id, intent.description);

    return reply.code(200).send({
      signal_id: id,
      intent: { type: intent.intent_type, description: intent.description },
      execution: { plan_id: plan.id, status: executedPlan.status },
      artifacts: artifacts.map(a => ({ id: a.id, type: a.artifact_type, title: a.title, content: a.metadata?.inline_content, metadata: a.metadata })),
    });
  });

  // List signals
  app.get('/api/signals', async (request, reply) => {
    const { limit = 20, offset = 0, modality, status } = request.query as any;
    let sql = 'SELECT * FROM signals';
    const conditions: string[] = [];
    const params: any[] = [];
    if (modality) { params.push(modality); conditions.push(`modality = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    params.push(parseInt(limit)); sql += ` LIMIT $${params.length}`;
    params.push(parseInt(offset)); sql += ` OFFSET $${params.length}`;
    const signals = await getMany(sql, params);
    const total = await query('SELECT COUNT(*) FROM signals');
    return reply.send({ signals, total: parseInt(total.rows[0].count) });
  });

  // Get signal detail
  app.get('/api/signals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const signal = await getSignal(id);
    if (!signal) return reply.code(404).send({ error: 'Signal not found' });
    const intents = await getMany('SELECT * FROM intents WHERE signal_id = $1', [id]);
    const plans = await getMany('SELECT * FROM execution_plans WHERE signal_id = $1', [id]);
    const artifacts = await getMany('SELECT * FROM artifacts WHERE signal_id = $1 ORDER BY version DESC', [id]);
    const feedbacks = await getMany('SELECT * FROM feedback WHERE signal_id = $1', [id]);
    return reply.send({ signal, intents, plans, artifacts, feedbacks });
  });

  // Similar signals
  app.get('/api/signals/:id/similar', async (request, reply) => {
    const { id } = request.params as { id: string };
    const signal = await getSignal(id);
    if (!signal?.embedding) return reply.send({ similar: [] });
    const similar = await findSimilarSignals(signal.embedding, 5);
    return reply.send({ similar: similar.filter((s: any) => s.id !== id) });
  });
}

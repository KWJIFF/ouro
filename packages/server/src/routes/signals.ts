import type { FastifyInstance } from 'fastify';
import { generateId, now } from '@ouro/core';
import type { FilePayload } from '@ouro/core';
import { captureSignal, getSignal, getRecentSignals, updateSignalStatus, findSimilarSignals } from '../services/signal-capture';
import { parseIntent } from '../services/intent-parser';
import { generatePlan } from '../services/execution-planner';
import { executePlan } from '../services/execution-runner';
import { recoverSignals } from '../services/signal-recovery';
import { query, getMany } from '../db/client';
import { embedText } from '../ai/llm-client';

export async function signalRoutes(app: FastifyInstance) {

  // ===== POST /api/signals — THE core endpoint =====
  // Accepts: JSON body OR multipart/form-data (for file uploads)
  app.post('/api/signals', async (request, reply) => {
    let text = '';
    let files: FilePayload[] = [];
    let urls: string[] = [];
    let metadata: Record<string, any> = {};
    let contextData: Record<string, any> = {};

    const contentType = request.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file uploads
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          files.push({
            filename: part.filename || 'unnamed',
            mime_type: part.mimetype || 'application/octet-stream',
            size_bytes: Buffer.concat(chunks).length,
            buffer: Buffer.concat(chunks),
          });
        } else {
          // Form field
          const value = part.value as string;
          if (part.fieldname === 'text' || part.fieldname === 'content' || part.fieldname === 'signal') text = value;
          else if (part.fieldname === 'urls') urls = JSON.parse(value || '[]');
          else if (part.fieldname === 'context') contextData = JSON.parse(value || '{}');
          else if (part.fieldname === 'metadata') metadata = JSON.parse(value || '{}');
        }
      }
    } else {
      // JSON body
      const body = request.body as any;
      text = body.text || body.content || body.signal || '';
      files = body.files || [];
      urls = body.urls || [];
      metadata = body.metadata || {};
      contextData = body.context || {};
    }

    const input = {
      source: { type: 'api' as const, ...metadata.source },
      payload: { text, files, urls, metadata },
      context: {
        timestamp: now(),
        session_id: contextData.session_id || generateId(),
        device: contextData.device || request.headers['user-agent'] || 'unknown',
        ...contextData,
      },
    };

    try {
      // Layer 1: Capture (multi-modal processing happens here)
      const signal = await captureSignal(input);

      // Layer 2: Parse intent
      const intent = await parseIntent(signal);
      await updateSignalStatus(signal.id, 'parsed');

      if (intent.needs_clarification) {
        return reply.code(200).send({
          signal_id: signal.id,
          intent_id: intent.id,
          status: 'needs_clarification',
          question: intent.clarification_question,
        });
      }

      // Layer 3: Plan + Execute
      await updateSignalStatus(signal.id, 'executing');
      const plan = await generatePlan(intent);
      const executedPlan = await executePlan(plan);

      // Layer 5: Signal recovery (background)
      recoverSignals(signal, intent, executedPlan).catch(e =>
        console.error('Signal recovery failed:', e)
      );

      const finalStatus = executedPlan.status === 'completed' ? 'completed' : 'failed';
      await updateSignalStatus(signal.id, finalStatus);

      const artifacts = executedPlan.steps
        .filter(s => s.output?.artifacts)
        .flatMap(s => s.output.artifacts);

      // Store artifacts in DB
      for (const artifact of artifacts) {
        await query(
          `INSERT INTO artifacts (id, plan_id, signal_id, artifact_type, title, description, content_url, content_hash, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [generateId(), plan.id, signal.id, artifact.metadata?.type || 'other',
           intent.description.slice(0, 100), intent.description,
           '', // content_url — inline for now
           generateId(), // content_hash placeholder
           JSON.stringify(artifact.metadata), now()]
        );
      }

      return reply.code(201).send({
        signal_id: signal.id,
        intent: { type: intent.intent_type, description: intent.description, confidence: intent.confidence },
        execution: {
          plan_id: plan.id,
          status: executedPlan.status,
          steps: executedPlan.steps.map(s => ({ id: s.id, tool: s.tool, status: s.status })),
        },
        artifacts,
      });
    } catch (error: any) {
      console.error('Signal processing error:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // ===== POST /api/signals/:id/clarify =====
  app.post('/api/signals/:id/clarify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { answer } = request.body as { answer: string };
    const signal = await getSignal(id);
    if (!signal) return reply.code(404).send({ error: 'Signal not found' });

    signal.normalized_text += `\n[Clarification: ${answer}]`;
    const intent = await parseIntent(signal);
    const plan = await generatePlan(intent);
    const executedPlan = await executePlan(plan);

    const artifacts = executedPlan.steps.filter(s => s.output?.artifacts).flatMap(s => s.output.artifacts);
    return reply.code(200).send({
      signal_id: id,
      intent: { type: intent.intent_type, description: intent.description },
      execution: { plan_id: plan.id, status: executedPlan.status },
      artifacts,
    });
  });

  // ===== GET /api/signals =====
  app.get('/api/signals', async (request, reply) => {
    const { limit = 20, offset = 0, modality, status } = request.query as any;
    let sql = 'SELECT * FROM signals';
    const conditions: string[] = [];
    const params: any[] = [];

    if (modality) { params.push(modality); conditions.push(`modality = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

    sql += ' ORDER BY created_at DESC';
    params.push(limit); sql += ` LIMIT $${params.length}`;
    params.push(offset); sql += ` OFFSET $${params.length}`;

    const signals = await getMany(sql, params);
    const total = await query('SELECT COUNT(*) FROM signals');
    return reply.send({ signals, total: parseInt(total.rows[0].count), limit, offset });
  });

  // ===== GET /api/signals/:id =====
  app.get('/api/signals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const signal = await getSignal(id);
    if (!signal) return reply.code(404).send({ error: 'Signal not found' });

    const intents = await getMany('SELECT * FROM intents WHERE signal_id = $1 ORDER BY created_at', [id]);
    const plans = await getMany('SELECT * FROM execution_plans WHERE signal_id = $1 ORDER BY created_at', [id]);
    const artifacts = await getMany('SELECT * FROM artifacts WHERE signal_id = $1 ORDER BY created_at', [id]);
    const feedbacks = await getMany('SELECT * FROM feedback WHERE signal_id = $1 ORDER BY created_at', [id]);

    return reply.send({ signal, intents, plans, artifacts, feedbacks });
  });

  // ===== GET /api/signals/:id/similar =====
  app.get('/api/signals/:id/similar', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = 5 } = request.query as any;
    const signal = await getSignal(id);
    if (!signal) return reply.code(404).send({ error: 'Signal not found' });

    if (!signal.embedding) {
      return reply.send({ similar: [] });
    }

    const similar = await findSimilarSignals(signal.embedding, limit);
    return reply.send({ similar: similar.filter(s => s.id !== id) });
  });
}

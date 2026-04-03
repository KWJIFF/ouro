import type { FastifyInstance } from 'fastify';
import { generateId, now } from '@ouro/core';
import { captureSignal, getSignal, getRecentSignals, updateSignalStatus } from '../services/signal-capture';
import { parseIntent } from '../services/intent-parser';
import { generatePlan } from '../services/execution-planner';
import { executePlan } from '../services/execution-runner';
import { recoverSignals } from '../services/signal-recovery';
import { query, getMany } from '../db/client';

export async function signalRoutes(app: FastifyInstance) {
  // POST /api/signals — Submit a new signal (THE core endpoint)
  app.post('/api/signals', async (request, reply) => {
    const body = request.body as any;

    // Accept ANYTHING — never reject
    const input = {
      source: body.source || { type: 'api' as const },
      payload: {
        text: body.text || body.content || body.signal || '',
        files: body.files || [],
        urls: body.urls || [],
        metadata: body.metadata || {},
      },
      context: {
        timestamp: now(),
        session_id: body.session_id || generateId(),
        device: body.device || 'unknown',
        ...(body.context || {}),
      },
    };

    try {
      // Layer 1: Capture
      const signal = await captureSignal(input);

      // Layer 2: Parse intent
      const intent = await parseIntent(signal);
      await updateSignalStatus(signal.id, 'parsed');

      // If clarification needed, return early
      if (intent.needs_clarification) {
        return reply.code(200).send({
          signal_id: signal.id,
          intent_id: intent.id,
          status: 'needs_clarification',
          question: intent.clarification_question,
        });
      }

      // Layer 3: Plan
      const plan = await generatePlan(intent);
      await updateSignalStatus(signal.id, 'executing');

      // Layer 3+4: Execute (async in background for real-time streaming)
      // For MVP, execute synchronously
      const executedPlan = await executePlan(plan);

      // Layer 5: Signal recovery (async, non-blocking)
      recoverSignals(signal, intent, executedPlan).catch(e =>
        console.error('Signal recovery failed:', e)
      );

      await updateSignalStatus(signal.id, executedPlan.status === 'completed' ? 'completed' : 'failed');

      // Build response with artifacts
      const artifacts = executedPlan.steps
        .filter(s => s.output?.artifacts)
        .flatMap(s => s.output.artifacts);

      return reply.code(201).send({
        signal_id: signal.id,
        intent: {
          type: intent.intent_type,
          description: intent.description,
          confidence: intent.confidence,
        },
        execution: {
          plan_id: plan.id,
          status: executedPlan.status,
          steps: executedPlan.steps.map(s => ({
            id: s.id,
            tool: s.tool,
            status: s.status,
          })),
        },
        artifacts,
      });
    } catch (error: any) {
      console.error('Signal processing error:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // POST /api/signals/:id/clarify — Answer a clarification question
  app.post('/api/signals/:id/clarify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { answer } = request.body as { answer: string };

    // Update the signal with clarification and re-trigger the pipeline
    const signal = await getSignal(id);
    if (!signal) return reply.code(404).send({ error: 'Signal not found' });

    // Append clarification to signal text and reprocess
    signal.normalized_text += `\n[Clarification: ${answer}]`;
    const intent = await parseIntent(signal);
    const plan = await generatePlan(intent);
    const executedPlan = await executePlan(plan);

    const artifacts = executedPlan.steps
      .filter(s => s.output?.artifacts)
      .flatMap(s => s.output.artifacts);

    return reply.code(200).send({
      signal_id: id,
      intent: { type: intent.intent_type, description: intent.description },
      execution: { plan_id: plan.id, status: executedPlan.status },
      artifacts,
    });
  });

  // GET /api/signals — List recent signals
  app.get('/api/signals', async (request, reply) => {
    const { limit = 20, offset = 0 } = request.query as any;
    const signals = await getMany(
      'SELECT * FROM signals ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const total = await query('SELECT COUNT(*) FROM signals');
    return reply.send({ signals, total: parseInt(total.rows[0].count) });
  });

  // GET /api/signals/:id — Get signal details
  app.get('/api/signals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const signal = await getSignal(id);
    if (!signal) return reply.code(404).send({ error: 'Signal not found' });

    const intent = await query('SELECT * FROM intents WHERE signal_id = $1', [id]);
    const plans = await query('SELECT * FROM execution_plans WHERE signal_id = $1', [id]);
    const artifacts = await query('SELECT * FROM artifacts WHERE signal_id = $1', [id]);

    return reply.send({
      signal,
      intents: intent.rows,
      plans: plans.rows,
      artifacts: artifacts.rows,
    });
  });
}

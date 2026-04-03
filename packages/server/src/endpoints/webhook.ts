import type { FastifyInstance } from 'fastify';
import { generateId, now } from '@ouro/core';
import { captureSignal, updateSignalStatus } from '../services/signal-capture';
import { parseIntent } from '../services/intent-parser';
import { generatePlan } from '../services/execution-planner';
import { executePlan } from '../services/execution-runner';

/**
 * Webhook endpoint — any external system can push signals to Ouro.
 * This enables: Zapier integrations, IFTTT, custom automations,
 * monitoring systems, IoT devices, etc.
 */

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/api/webhook/:source', async (request, reply) => {
    const { source } = request.params as { source: string };
    const body = request.body as any;

    const input = {
      source: { type: 'webhook' as const, platform: source },
      payload: {
        text: body.text || body.message || body.content || JSON.stringify(body),
        files: [],
        urls: body.urls || [],
        metadata: { webhook_source: source, raw_payload: body },
      },
      context: {
        timestamp: now(),
        session_id: generateId(),
        device: `webhook:${source}`,
      },
    };

    const signal = await captureSignal(input);
    const intent = await parseIntent(signal);
    await updateSignalStatus(signal.id, 'parsed');

    if (intent.intent_type === 'capture') {
      await updateSignalStatus(signal.id, 'completed');
      return reply.code(201).send({ signal_id: signal.id, status: 'captured' });
    }

    const plan = await generatePlan(intent);
    const executedPlan = await executePlan(plan);
    await updateSignalStatus(signal.id, executedPlan.status === 'completed' ? 'completed' : 'failed');

    return reply.code(201).send({
      signal_id: signal.id,
      intent: intent.intent_type,
      status: executedPlan.status,
    });
  });
}

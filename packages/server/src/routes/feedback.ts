import type { FastifyInstance } from 'fastify';
import { generateId, now } from '@ouro/core';
import { recordFeedback } from '../services/signal-recovery';

export async function feedbackRoutes(app: FastifyInstance) {
  app.post('/api/feedback', async (request, reply) => {
    const body = request.body as any;

    await recordFeedback({
      id: generateId(),
      artifact_id: body.artifact_id,
      signal_id: body.signal_id,
      action: body.action,
      modification: body.modification,
      time_to_react_ms: body.time_to_react_ms,
      view_duration_ms: body.view_duration_ms,
      scroll_depth: body.scroll_depth,
      satisfaction_score: body.satisfaction_score,
      created_at: now(),
    });

    return reply.code(201).send({ status: 'recorded' });
  });
}

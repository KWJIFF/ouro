import type { FastifyInstance } from 'fastify';
import { processFeedback, getArtifactFeedback, getSignalFeedbackSummary } from '../services/feedback-processor';

export async function feedbackRoutes(app: FastifyInstance) {
  app.post('/api/feedback', async (request, reply) => {
    const body = request.body as any;
    const feedback = await processFeedback({
      artifact_id: body.artifact_id,
      signal_id: body.signal_id,
      action: body.action,
      modification: body.modification,
      time_to_react_ms: body.time_to_react_ms,
      view_duration_ms: body.view_duration_ms,
      scroll_depth: body.scroll_depth,
    });
    return reply.code(201).send(feedback);
  });

  app.get('/api/feedback/artifact/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const feedbacks = await getArtifactFeedback(id);
    return reply.send({ feedbacks });
  });

  app.get('/api/feedback/signal/:id/summary', async (request, reply) => {
    const { id } = request.params as { id: string };
    const summary = await getSignalFeedbackSummary(id);
    return reply.send(summary);
  });
}

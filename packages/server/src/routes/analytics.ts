import type { FastifyInstance } from 'fastify';
import { getFullAnalytics } from '../services/analytics';

export async function analyticsRoutes(app: FastifyInstance) {
  app.get('/api/analytics', async (request, reply) => {
    const analytics = await getFullAnalytics();
    return reply.send(analytics);
  });

  app.get('/api/analytics/overview', async (request, reply) => {
    const analytics = await getFullAnalytics();
    return reply.send(analytics.overview);
  });

  app.get('/api/analytics/signals', async (request, reply) => {
    const analytics = await getFullAnalytics();
    return reply.send(analytics.signal_analytics);
  });

  app.get('/api/analytics/evolution', async (request, reply) => {
    const analytics = await getFullAnalytics();
    return reply.send(analytics.evolution_analytics);
  });

  app.get('/api/analytics/patterns', async (request, reply) => {
    const analytics = await getFullAnalytics();
    return reply.send(analytics.pattern_analytics);
  });
}

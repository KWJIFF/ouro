import type { FastifyInstance } from 'fastify';
import { cache } from '../services/cache';

export async function cacheRoutes(app: FastifyInstance) {
  app.get('/api/admin/cache', async (request, reply) => {
    return reply.send(cache.getStats());
  });

  app.post('/api/admin/cache/clear', async (request, reply) => {
    await cache.invalidatePattern('');
    return reply.send({ status: 'cleared' });
  });
}

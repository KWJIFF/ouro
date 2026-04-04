import type { FastifyInstance } from 'fastify';
import { getConfig, setConfig, getAllConfig, getConfigChangelog } from '../services/config-manager';

export async function configRoutes(app: FastifyInstance) {
  // Get all config
  app.get('/api/config', async (request, reply) => {
    const { category } = request.query as any;
    const configs = await getAllConfig(category);
    return reply.send({ configs });
  });

  // Get single config
  app.get('/api/config/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const value = await getConfig(key);
    return reply.send({ key, value });
  });

  // Set config value
  app.put('/api/config/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value, reason } = request.body as { value: any; reason?: string };
    await setConfig(key, value, 'user', reason || 'Manual update');
    return reply.send({ key, value, status: 'updated' });
  });

  // Config changelog
  app.get('/api/config/changelog', async (request, reply) => {
    const { key, limit } = request.query as any;
    const changelog = await getConfigChangelog(key, parseInt(limit || '50'));
    return reply.send({ changelog });
  });
}

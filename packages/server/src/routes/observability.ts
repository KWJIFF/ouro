import type { FastifyInstance } from 'fastify';
import { getRecentLogs, getLogStats } from '../middleware/request-logger';
import { query, getOne } from '../db/client';

export async function observabilityRoutes(app: FastifyInstance) {
  // Request logs
  app.get('/api/admin/logs', async (request, reply) => {
    const { limit } = request.query as any;
    return reply.send({ logs: getRecentLogs(parseInt(limit || '50')) });
  });

  // Request stats
  app.get('/api/admin/stats', async (request, reply) => {
    const logStats = getLogStats();
    const dbStats = await getOne<any>(`
      SELECT
        (SELECT COUNT(*) FROM signals) as total_signals,
        (SELECT COUNT(*) FROM intents) as total_intents,
        (SELECT COUNT(*) FROM execution_plans) as total_plans,
        (SELECT COUNT(*) FROM artifacts) as total_artifacts,
        (SELECT COUNT(*) FROM feedback) as total_feedback,
        (SELECT COUNT(*) FROM signal_patterns) as total_patterns,
        (SELECT COUNT(*) FROM evolution_events) as total_evolutions,
        (SELECT COUNT(*) FROM idea_connections) as total_connections
    `);

    return reply.send({
      requests: logStats,
      database: dbStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  // Database health
  app.get('/api/admin/db-health', async (request, reply) => {
    try {
      const start = Date.now();
      await query('SELECT 1');
      return reply.send({ status: 'healthy', latency_ms: Date.now() - start });
    } catch (e: any) {
      return reply.code(503).send({ status: 'unhealthy', error: e.message });
    }
  });
}

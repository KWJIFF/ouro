import type { FastifyInstance } from 'fastify';
import { getHealthReport } from '../services/health-monitor';
import { getRateLimitStats } from '../middleware/user-rate-limiter';
import { pipelineHooks } from '../middleware/pipeline-hooks';

export async function healthRoutes(app: FastifyInstance) {
  // Detailed health check
  app.get('/api/health/detailed', async (request, reply) => {
    const report = await getHealthReport();
    const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
    return reply.code(statusCode).send(report);
  });

  // Rate limit stats
  app.get('/api/admin/rate-limits', async (request, reply) => {
    return reply.send(getRateLimitStats());
  });

  // Pipeline hooks registry
  app.get('/api/admin/hooks', async (request, reply) => {
    return reply.send({ hooks: pipelineHooks.getRegistered() });
  });
}

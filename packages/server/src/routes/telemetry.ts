import type { FastifyInstance } from 'fastify';
import { telemetry } from '../services/telemetry';

export async function telemetryRoutes(app: FastifyInstance) {
  app.get('/api/admin/telemetry', async (request, reply) => {
    return reply.send(telemetry.getReport());
  });

  app.post('/api/admin/telemetry/reset', async (request, reply) => {
    telemetry.reset();
    return reply.send({ status: 'reset' });
  });
}

import type { FastifyInstance } from 'fastify';
import { scheduler } from '../services/scheduler';

export async function schedulerRoutes(app: FastifyInstance) {
  app.get('/api/admin/scheduler', async (request, reply) => {
    return reply.send({ tasks: scheduler.getStatus() });
  });

  app.post('/api/admin/scheduler/:task/run', async (request, reply) => {
    const { task } = request.params as { task: string };
    try {
      await scheduler.runNow(task);
      return reply.send({ status: 'executed', task });
    } catch (e: any) {
      return reply.code(404).send({ error: e.message });
    }
  });

  app.post('/api/admin/scheduler/:task/disable', async (request, reply) => {
    const { task } = request.params as { task: string };
    scheduler.disableTask(task);
    return reply.send({ status: 'disabled', task });
  });

  app.post('/api/admin/scheduler/:task/enable', async (request, reply) => {
    const { task } = request.params as { task: string };
    scheduler.enableTask(task);
    return reply.send({ status: 'enabled', task });
  });
}

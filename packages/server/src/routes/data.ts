import type { FastifyInstance } from 'fastify';
import { exportSignals, importSignals } from '../services/data-export';

export async function dataRoutes(app: FastifyInstance) {
  // Export signals
  app.get('/api/admin/export', async (request, reply) => {
    const { format, from, to, include_artifacts, include_patterns, anonymize } = request.query as any;

    const data = await exportSignals({
      format: format || 'json',
      dateRange: from && to ? { from, to } : undefined,
      includeArtifacts: include_artifacts === 'true',
      includePatterns: include_patterns === 'true',
      anonymize: anonymize === 'true',
    });

    if (format === 'csv') {
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename=ouro-signals.csv');
    } else if (format === 'markdown') {
      reply.header('Content-Type', 'text/markdown');
      reply.header('Content-Disposition', 'attachment; filename=ouro-signals.md');
    } else {
      reply.header('Content-Type', 'application/json');
    }

    return reply.send(data);
  });

  // Import signals
  app.post('/api/admin/import', async (request, reply) => {
    const body = request.body as string;
    const result = await importSignals(typeof body === 'string' ? body : JSON.stringify(body));
    return reply.send(result);
  });
}

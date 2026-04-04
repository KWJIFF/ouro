import type { FastifyInstance } from 'fastify';
import { replaySignals } from '../services/signal-replay';

export async function replayRoutes(app: FastifyInstance) {
  // Replay signals through current pipeline
  app.post('/api/admin/replay', async (request, reply) => {
    const { signal_ids, date_from, date_to, limit, dry_run } = request.body as any;

    const options: any = {
      dryRun: dry_run || false,
      limit: limit || 20,
    };

    if (signal_ids?.length) options.signalIds = signal_ids;
    if (date_from && date_to) options.dateRange = { from: date_from, to: date_to };

    const result = await replaySignals(options);
    return reply.send(result);
  });
}

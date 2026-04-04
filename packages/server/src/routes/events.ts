import type { FastifyInstance } from 'fastify';
import { eventBus } from '../services/event-bus';

export async function eventRoutes(app: FastifyInstance) {
  // Recent events
  app.get('/api/events', async (request, reply) => {
    const { limit, type } = request.query as any;
    const events = eventBus.getRecentEvents(parseInt(limit || '50'), type);
    return reply.send({ events, count: events.length });
  });

  // Event counts
  app.get('/api/events/counts', async (request, reply) => {
    return reply.send(eventBus.getEventCounts());
  });

  // Event rate (events per minute)
  app.get('/api/events/rate', async (request, reply) => {
    const { window } = request.query as any;
    return reply.send({
      events_per_minute: eventBus.getEventRate(parseInt(window || '60000')),
      window_ms: parseInt(window || '60000'),
    });
  });

  // SSE stream for real-time events
  app.get('/api/events/stream', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const handler = (data: any) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Subscribe to all major events
    const events = ['signal:captured', 'signal:completed', 'intent:parsed',
      'step:started', 'step:completed', 'artifact:created',
      'evolution:event', 'phase:transition'];

    for (const event of events) {
      eventBus.on(event as any, handler);
    }

    request.raw.on('close', () => {
      for (const event of events) {
        eventBus.removeListener(event, handler);
      }
    });
  });
}

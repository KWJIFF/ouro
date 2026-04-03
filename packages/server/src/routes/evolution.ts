import type { FastifyInstance } from 'fastify';
import { getOne, getMany } from '../db/client';
import { runEvolutionCycle } from '../services/evolution-engine';

export async function evolutionRoutes(app: FastifyInstance) {
  app.get('/api/evolution/stats', async (request, reply) => {
    const phase = await getOne('SELECT value FROM system_state WHERE key = $1', ['meme_phase']);
    const cycles = await getOne('SELECT value FROM system_state WHERE key = $1', ['evolution_cycle_count']);
    const recentEvents = await getMany(
      'SELECT * FROM evolution_events ORDER BY created_at DESC LIMIT 10'
    );
    const patternCount = await getOne('SELECT COUNT(*) as count FROM signal_patterns');

    return reply.send({
      phase: phase?.value || 'symbiosis',
      evolution_cycle_count: parseInt(cycles?.value || '0'),
      recent_events: recentEvents,
      total_patterns: parseInt(patternCount?.count || '0'),
    });
  });

  app.get('/api/evolution/log', async (request, reply) => {
    const { limit = 20 } = request.query as any;
    const events = await getMany(
      'SELECT * FROM evolution_events ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return reply.send({ events });
  });

  // Manual trigger for evolution cycle
  app.post('/api/evolution/trigger', async (request, reply) => {
    const events = await runEvolutionCycle();
    return reply.send({ events_generated: events.length, events });
  });
}

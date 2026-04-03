import type { FastifyInstance } from 'fastify';
import { getIdeaGraph, createConnection, getSignalConnections } from '../services/idea-graph';
import { semanticSearch, findRelatedArtifacts } from '../services/semantic-search';

export async function graphRoutes(app: FastifyInstance) {
  // Idea graph
  app.get('/api/graph', async (request, reply) => {
    const { root, depth } = request.query as any;
    const graph = await getIdeaGraph(root, parseInt(depth || '3'));
    return reply.send(graph);
  });

  app.get('/api/signals/:id/connections', async (request, reply) => {
    const { id } = request.params as { id: string };
    const connections = await getSignalConnections(id);
    return reply.send({ connections });
  });

  app.post('/api/connections', async (request, reply) => {
    const { source_id, target_id, type, strength } = request.body as any;
    await createConnection(source_id, target_id, type || 'manual', strength || 0.8, 'user');
    return reply.code(201).send({ status: 'created' });
  });

  // Semantic search
  app.get('/api/search', async (request, reply) => {
    const { q, limit } = request.query as any;
    if (!q) return reply.code(400).send({ error: 'Query parameter q is required' });
    const results = await semanticSearch(q, parseInt(limit || '10'));
    return reply.send({ query: q, results });
  });

  app.get('/api/search/artifacts', async (request, reply) => {
    const { q, limit } = request.query as any;
    if (!q) return reply.code(400).send({ error: 'Query parameter q is required' });
    const results = await findRelatedArtifacts(q, parseInt(limit || '5'));
    return reply.send({ query: q, results });
  });
}

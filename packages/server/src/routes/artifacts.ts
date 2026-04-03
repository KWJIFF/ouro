import type { FastifyInstance } from 'fastify';
import { getArtifact, getArtifactVersions, getLatestArtifacts } from '../services/artifact-builder';

export async function artifactRoutes(app: FastifyInstance) {
  app.get('/api/artifacts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const artifact = await getArtifact(id);
    if (!artifact) return reply.code(404).send({ error: 'Artifact not found' });
    return reply.send(artifact);
  });

  app.get('/api/artifacts/:id/versions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const artifact = await getArtifact(id);
    if (!artifact) return reply.code(404).send({ error: 'Artifact not found' });
    const versions = await getArtifactVersions(artifact.signal_id, artifact.artifact_type);
    return reply.send({ versions });
  });

  app.get('/api/signals/:signalId/artifacts', async (request, reply) => {
    const { signalId } = request.params as { signalId: string };
    const artifacts = await getLatestArtifacts(signalId);
    return reply.send({ artifacts });
  });
}

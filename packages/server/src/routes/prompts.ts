import type { FastifyInstance } from 'fastify';
import {
  getActivePrompt, createPromptVersion, activatePromptVersion,
  rollbackPrompt, getPromptHistory,
} from '../ai/prompts/prompt-manager';

export async function promptRoutes(app: FastifyInstance) {
  // Get active prompt by name
  app.get('/api/prompts/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const content = await getActivePrompt(name);
    return reply.send({ name, content });
  });

  // Get prompt version history
  app.get('/api/prompts/:name/history', async (request, reply) => {
    const { name } = request.params as { name: string };
    const history = await getPromptHistory(name);
    return reply.send({ name, versions: history });
  });

  // Create new prompt version
  app.post('/api/prompts/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const { content, variables } = request.body as { content: string; variables?: string[] };
    const template = await createPromptVersion(name, content, variables);
    return reply.code(201).send(template);
  });

  // Activate a specific version
  app.post('/api/prompts/:name/activate/:version', async (request, reply) => {
    const { name, version } = request.params as { name: string; version: string };
    await activatePromptVersion(name, parseInt(version));
    return reply.send({ status: 'activated', name, version: parseInt(version) });
  });

  // Rollback to previous version
  app.post('/api/prompts/:name/rollback', async (request, reply) => {
    const { name } = request.params as { name: string };
    const rolledBackTo = await rollbackPrompt(name);
    return reply.send({ status: 'rolled_back', name, version: rolledBackTo });
  });
}

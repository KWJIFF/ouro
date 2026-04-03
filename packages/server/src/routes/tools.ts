import type { FastifyInstance } from 'fastify';
import { toolRegistry } from '../tools/registry';
import { loadRemoteTool, generateTool } from '../tools/plugin-loader';

export async function toolRoutes(app: FastifyInstance) {
  // List all registered tools
  app.get('/api/tools', async (request, reply) => {
    const manifests = toolRegistry.getAllManifests();
    return reply.send({ tools: manifests, count: manifests.length });
  });

  // Get specific tool
  app.get('/api/tools/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tool = toolRegistry.getTool(id);
    if (!tool) return reply.code(404).send({ error: 'Tool not found' });
    return reply.send(tool.manifest);
  });

  // Register remote tool
  app.post('/api/tools/register', async (request, reply) => {
    const { url, manifest } = request.body as any;
    if (url) {
      const success = await loadRemoteTool(url);
      return reply.send({ success, source: 'remote' });
    }
    return reply.code(400).send({ error: 'URL required' });
  });

  // Auto-generate a tool
  app.post('/api/tools/generate', async (request, reply) => {
    const { capability } = request.body as any;
    if (!capability) return reply.code(400).send({ error: 'capability description required' });
    const tool = await generateTool(capability);
    return reply.send({ success: !!tool, tool: tool?.manifest });
  });
}

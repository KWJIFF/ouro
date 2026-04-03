import type { OuroTool, ToolInput, ToolOutput, ToolManifest } from '@ouro/core';
import { callAI } from '../ai/llm-client';

const manifest: ToolManifest = {
  id: 'api_builder',
  version: '0.1.0',
  name: 'API Builder',
  description: 'Design and generate complete REST API implementations including routes, controllers, models, middleware, validation schemas, and documentation. Supports Express, Fastify, Flask, FastAPI, and other frameworks.',
  capabilities: ['api_design', 'rest_api', 'graphql', 'backend', 'server', 'endpoint_design'],
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'What the API should do' },
      framework: { type: 'string', description: 'Backend framework (express, fastify, flask, fastapi, etc.)' },
      database: { type: 'string', description: 'Database (postgresql, mongodb, sqlite, etc.)' },
      auth: { type: 'string', description: 'Authentication method (jwt, api_key, oauth, none)' },
      endpoints: { type: 'array', items: { type: 'string' }, description: 'Specific endpoints to generate' },
    },
    required: ['description'],
  },
  output_schema: {
    type: 'object',
    properties: {
      files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } } },
      documentation: { type: 'string' },
    },
  },
  tags: ['api', 'backend', 'server', 'rest'],
};

export const apiBuilderTool: OuroTool = {
  manifest,

  async execute(input: ToolInput): Promise<ToolOutput> {
    const { description, framework, database, auth, endpoints } = input.parameters;
    const startTime = Date.now();

    const systemPrompt = `You are an API architect. Generate a complete, production-ready API implementation.

Framework: ${framework || 'Express.js'}
Database: ${database || 'PostgreSQL'}  
Auth: ${auth || 'JWT'}
${endpoints ? `Required endpoints: ${endpoints.join(', ')}` : ''}

Generate the COMPLETE implementation as a single file with clear section markers.
Include:
1. All imports and setup
2. Database schema/models
3. Middleware (auth, validation, error handling)
4. All route handlers with full CRUD
5. Input validation schemas
6. Error responses
7. API documentation comments

Make it production-ready: proper error handling, input validation, status codes, pagination.`;

    const response = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Build an API for: ${description}` },
    ], { temperature: 0.4, max_tokens: 8192 });

    return {
      success: true,
      artifacts: [{
        type: 'text',
        content: response.content,
        metadata: {
          type: 'code',
          format: 'api',
          framework: framework || 'express',
          language: framework === 'fastapi' || framework === 'flask' ? 'python' : 'typescript',
        },
      }],
      metrics: { duration_ms: Date.now() - startTime, tokens_used: response.tokens_used.input + response.tokens_used.output },
    };
  },
};

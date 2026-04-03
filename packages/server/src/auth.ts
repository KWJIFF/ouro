import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from './config';

/**
 * Optional API key authentication.
 * If OURO_API_KEY is set in env, all requests must include it.
 * If not set, system runs open (personal use mode).
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = process.env.OURO_API_KEY;
  if (!apiKey) return; // No auth configured — open access

  const provided = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');
  if (provided !== apiKey) {
    return reply.code(401).send({ error: 'Invalid API key' });
  }
}

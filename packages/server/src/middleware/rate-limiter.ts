import type { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};

export function createRateLimiter(opts: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: FastifyRequest) => string;
}) {
  const windowMs = opts.windowMs || 60000; // 1 minute
  const maxRequests = opts.maxRequests || 60;
  const keyGen = opts.keyGenerator || ((req: FastifyRequest) => req.ip || 'unknown');

  return async function rateLimiter(request: FastifyRequest, reply: FastifyReply) {
    const key = keyGen(request);
    const now = Date.now();

    if (!store[key] || store[key].resetAt < now) {
      store[key] = { count: 0, resetAt: now + windowMs };
    }

    store[key].count++;

    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count));
    reply.header('X-RateLimit-Reset', Math.ceil(store[key].resetAt / 1000));

    if (store[key].count > maxRequests) {
      return reply.code(429).send({
        error: 'Too many requests',
        retryAfter: Math.ceil((store[key].resetAt - now) / 1000),
      });
    }
  };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(store)) {
    if (store[key].resetAt < now) delete store[key];
  }
}, 300000);

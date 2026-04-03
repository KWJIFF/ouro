import type { FastifyRequest, FastifyReply } from 'fastify';

export interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  duration_ms: number;
  ip: string;
  user_agent: string;
  content_type: string;
  body_size: number;
}

const logs: RequestLog[] = [];
const MAX_LOGS = 10000;

export async function requestLogger(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();

  reply.raw.on('finish', () => {
    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      status: reply.statusCode,
      duration_ms: Date.now() - startTime,
      ip: request.ip || 'unknown',
      user_agent: (request.headers['user-agent'] || '').slice(0, 200),
      content_type: request.headers['content-type'] || '',
      body_size: request.headers['content-length'] ? parseInt(request.headers['content-length']) : 0,
    };

    logs.push(log);
    if (logs.length > MAX_LOGS) logs.shift();

    // Log slow requests
    if (log.duration_ms > 5000) {
      console.warn(`[SLOW] ${log.method} ${log.url} took ${log.duration_ms}ms`);
    }
  });
}

export function getRecentLogs(limit: number = 100): RequestLog[] {
  return logs.slice(-limit);
}

export function getLogStats(): {
  total: number;
  avgDuration: number;
  errorRate: number;
  topEndpoints: Array<{ url: string; count: number; avgMs: number }>;
} {
  const total = logs.length;
  if (total === 0) return { total: 0, avgDuration: 0, errorRate: 0, topEndpoints: [] };

  const avgDuration = logs.reduce((s, l) => s + l.duration_ms, 0) / total;
  const errors = logs.filter(l => l.status >= 400).length;

  const endpointMap: Record<string, { count: number; totalMs: number }> = {};
  for (const log of logs) {
    const key = `${log.method} ${log.url.split('?')[0]}`;
    if (!endpointMap[key]) endpointMap[key] = { count: 0, totalMs: 0 };
    endpointMap[key].count++;
    endpointMap[key].totalMs += log.duration_ms;
  }

  const topEndpoints = Object.entries(endpointMap)
    .map(([url, data]) => ({ url, count: data.count, avgMs: Math.round(data.totalMs / data.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { total, avgDuration: Math.round(avgDuration), errorRate: errors / total, topEndpoints };
}

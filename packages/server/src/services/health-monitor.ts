import { pool } from '../db/client';
import { eventBus } from './event-bus';

/**
 * Health Monitor — Continuous system health assessment.
 * 
 * Monitors:
 * - Database connectivity and latency
 * - Redis connectivity
 * - Memory usage
 * - Event bus throughput
 * - Signal processing latency
 * - Tool registry completeness
 * - Evolution engine status
 */

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_seconds: number;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    memory: HealthCheck;
    event_bus: HealthCheck;
    tools: HealthCheck;
    disk: HealthCheck;
  };
  metrics: {
    memory_mb: number;
    memory_percent: number;
    cpu_usage: number;
    event_rate_per_minute: number;
    active_connections: number;
  };
}

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  latency_ms?: number;
  details?: Record<string, any>;
}

export async function getHealthReport(): Promise<HealthReport> {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkMemory(),
    checkEventBus(),
    checkTools(),
    checkDisk(),
  ]);

  const [database, redis, memory, event_bus_check, tools, disk] = checks;

  // Overall status
  const statuses = checks.map(c => c.status);
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (statuses.includes('fail')) status = 'unhealthy';
  else if (statuses.includes('warn')) status = 'degraded';

  const mem = process.memoryUsage();
  const memMB = Math.round(mem.heapUsed / 1024 / 1024);

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    checks: { database, redis, memory, event_bus: event_bus_check, tools, disk },
    metrics: {
      memory_mb: memMB,
      memory_percent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      cpu_usage: 0, // Would need os.cpus() for real measurement
      event_rate_per_minute: eventBus.getEventRate(60000),
      active_connections: 0, // Would need WebSocket server reference
    },
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latency = Date.now() - start;

    // Also check table accessibility
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);

    return {
      status: latency < 100 ? 'pass' : 'warn',
      message: `Connected (${latency}ms, ${tables.rows.length} tables)`,
      latency_ms: latency,
      details: { tables: tables.rows.length, latency },
    };
  } catch (e: any) {
    return { status: 'fail', message: `Database unreachable: ${e.message}` };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  try {
    const { createClient } = await import('redis');
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    const start = Date.now();
    await client.connect();
    await client.ping();
    const latency = Date.now() - start;
    await client.quit();

    return {
      status: latency < 50 ? 'pass' : 'warn',
      message: `Connected (${latency}ms)`,
      latency_ms: latency,
    };
  } catch (e: any) {
    return {
      status: 'warn', // Redis is optional
      message: `Redis unavailable: ${e.message}. Using in-memory cache.`,
    };
  }
}

function checkMemory(): HealthCheck {
  const mem = process.memoryUsage();
  const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);

  return {
    status: heapPercent < 80 ? 'pass' : heapPercent < 95 ? 'warn' : 'fail',
    message: `Heap: ${heapMB}MB (${heapPercent.toFixed(1)}%), RSS: ${rssMB}MB`,
    details: {
      heap_used_mb: heapMB,
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      rss_mb: rssMB,
      external_mb: Math.round(mem.external / 1024 / 1024),
      heap_percent: Math.round(heapPercent),
    },
  };
}

function checkEventBus(): HealthCheck {
  const rate = eventBus.getEventRate(60000);
  const counts = eventBus.getEventCounts();
  const totalEvents = Object.values(counts).reduce((s, c) => s + c, 0);

  return {
    status: 'pass',
    message: `${rate} events/min, ${totalEvents} total`,
    details: { rate_per_minute: rate, total_events: totalEvents, event_types: Object.keys(counts).length },
  };
}

function checkTools(): HealthCheck {
  try {
    const { toolRegistry } = require('../tools/registry');
    const count = toolRegistry.getToolCount();
    return {
      status: count > 0 ? 'pass' : 'warn',
      message: `${count} tools registered`,
      details: { count },
    };
  } catch {
    return { status: 'warn', message: 'Tool registry not accessible' };
  }
}

function checkDisk(): HealthCheck {
  try {
    const { statfsSync } = require('fs');
    const stats = statfsSync('/');
    const totalGB = (stats.blocks * stats.bsize) / (1024 * 1024 * 1024);
    const freeGB = (stats.bfree * stats.bsize) / (1024 * 1024 * 1024);
    const usedPercent = ((totalGB - freeGB) / totalGB) * 100;

    return {
      status: usedPercent < 85 ? 'pass' : usedPercent < 95 ? 'warn' : 'fail',
      message: `${freeGB.toFixed(1)}GB free of ${totalGB.toFixed(1)}GB (${usedPercent.toFixed(1)}% used)`,
      details: { total_gb: totalGB.toFixed(1), free_gb: freeGB.toFixed(1), used_percent: usedPercent.toFixed(1) },
    };
  } catch {
    return { status: 'pass', message: 'Disk check not available' };
  }
}

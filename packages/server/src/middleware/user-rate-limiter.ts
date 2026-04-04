/**
 * Per-User Rate Limiter
 * 
 * Different limits for different operations:
 * - Signal submission: 60/min (generous — Constitutional: zero friction)
 * - Search queries: 30/min
 * - Admin operations: 10/min
 * - Evolution triggers: 5/min
 * 
 * Uses sliding window algorithm for accurate rate limiting.
 */

interface RateWindow {
  timestamps: number[];
}

const windows: Map<string, RateWindow> = new Map();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  signal: { maxRequests: 60, windowMs: 60000, keyPrefix: 'signal' },
  search: { maxRequests: 30, windowMs: 60000, keyPrefix: 'search' },
  admin: { maxRequests: 10, windowMs: 60000, keyPrefix: 'admin' },
  evolution: { maxRequests: 5, windowMs: 60000, keyPrefix: 'evolution' },
  feedback: { maxRequests: 120, windowMs: 60000, keyPrefix: 'feedback' },
  tools: { maxRequests: 20, windowMs: 60000, keyPrefix: 'tools' },
  webhook: { maxRequests: 100, windowMs: 60000, keyPrefix: 'webhook' },
};

export function checkRateLimit(
  userId: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetMs: number } {
  const key = `${config.keyPrefix}:${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let window = windows.get(key);
  if (!window) {
    window = { timestamps: [] };
    windows.set(key, window);
  }

  // Remove expired timestamps
  window.timestamps = window.timestamps.filter(t => t > windowStart);

  const remaining = config.maxRequests - window.timestamps.length;

  if (remaining <= 0) {
    const oldestInWindow = window.timestamps[0] || now;
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + config.windowMs - now,
    };
  }

  window.timestamps.push(now);
  return {
    allowed: true,
    remaining: remaining - 1,
    resetMs: config.windowMs,
  };
}

export function getRateLimitStats(): Record<string, { activeUsers: number; totalRequests: number }> {
  const stats: Record<string, { activeUsers: number; totalRequests: number }> = {};
  const now = Date.now();

  for (const [key, window] of windows) {
    const prefix = key.split(':')[0];
    if (!stats[prefix]) stats[prefix] = { activeUsers: 0, totalRequests: 0 };

    const activeTimestamps = window.timestamps.filter(t => t > now - 60000);
    if (activeTimestamps.length > 0) {
      stats[prefix].activeUsers++;
      stats[prefix].totalRequests += activeTimestamps.length;
    }
  }

  return stats;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of windows) {
    window.timestamps = window.timestamps.filter(t => t > now - 300000);
    if (window.timestamps.length === 0) windows.delete(key);
  }
}, 300000);

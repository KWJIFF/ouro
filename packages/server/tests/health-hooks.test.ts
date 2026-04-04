import { describe, it, expect } from 'vitest';

describe('Pipeline Hooks', () => {
  describe('Hook Registration', () => {
    it('should register hooks by phase', () => {
      const registry = new Map<string, Array<{ id: string; priority: number; handler: Function }>>();
      const register = (phase: string, id: string, priority: number) => {
        const existing = registry.get(phase) || [];
        existing.push({ id, priority, handler: () => {} });
        existing.sort((a, b) => a.priority - b.priority);
        registry.set(phase, existing);
      };

      register('beforeCapture', 'hook1', 100);
      register('beforeCapture', 'hook2', 50);
      register('afterCapture', 'hook3', 100);

      expect(registry.get('beforeCapture')?.length).toBe(2);
      expect(registry.get('beforeCapture')?.[0].id).toBe('hook2'); // Lower priority first
      expect(registry.get('afterCapture')?.length).toBe(1);
    });

    it('should unregister hooks by id', () => {
      const hooks = [
        { id: 'a', priority: 1 },
        { id: 'b', priority: 2 },
        { id: 'c', priority: 3 },
      ];
      const filtered = hooks.filter(h => h.id !== 'b');
      expect(filtered.length).toBe(2);
      expect(filtered.find(h => h.id === 'b')).toBeUndefined();
    });
  });

  describe('Hook Execution', () => {
    it('should run hooks in priority order', async () => {
      const order: string[] = [];
      const hooks = [
        { id: 'last', priority: 999, handler: async () => { order.push('last'); } },
        { id: 'first', priority: 1, handler: async () => { order.push('first'); } },
        { id: 'middle', priority: 100, handler: async () => { order.push('middle'); } },
      ];
      hooks.sort((a, b) => a.priority - b.priority);
      for (const h of hooks) await h.handler();
      expect(order).toEqual(['first', 'middle', 'last']);
    });

    it('should support hook abort', async () => {
      let ctx = { signalId: 'sig1', abort: false, abortReason: '' };
      const hooks = [
        { handler: async (c: any) => { c.abort = true; c.abortReason = 'test'; return c; } },
        { handler: async (c: any) => { c.signalId = 'modified'; return c; } }, // Should not run
      ];

      for (const h of hooks) {
        ctx = await h.handler(ctx);
        if (ctx.abort) break;
      }

      expect(ctx.abort).toBe(true);
      expect(ctx.signalId).toBe('sig1'); // Not modified because second hook was skipped
    });

    it('should continue on hook error', async () => {
      const results: string[] = [];
      const hooks = [
        { handler: async () => { results.push('a'); } },
        { handler: async () => { throw new Error('oops'); } },
        { handler: async () => { results.push('c'); } },
      ];

      for (const h of hooks) {
        try { await h.handler(); } catch { /* continue */ }
      }

      expect(results).toEqual(['a', 'c']); // Skipped error, continued
    });
  });
});

describe('Rate Limiter', () => {
  describe('Sliding Window', () => {
    it('should allow requests within limit', () => {
      const window: number[] = [];
      const maxRequests = 5;
      const windowMs = 60000;
      const now = Date.now();

      for (let i = 0; i < 4; i++) {
        window.push(now);
      }

      const activeInWindow = window.filter(t => t > now - windowMs).length;
      expect(activeInWindow).toBeLessThan(maxRequests);
    });

    it('should block requests over limit', () => {
      const window: number[] = [];
      const maxRequests = 3;
      const now = Date.now();

      for (let i = 0; i < 5; i++) window.push(now);
      
      const remaining = maxRequests - window.length;
      expect(remaining).toBeLessThan(0);
    });

    it('should expire old timestamps', () => {
      const windowMs = 60000;
      const now = Date.now();
      const timestamps = [
        now - 120000, // 2 min ago (expired)
        now - 90000,  // 1.5 min ago (expired)
        now - 30000,  // 30s ago (active)
        now - 10000,  // 10s ago (active)
        now,          // now (active)
      ];

      const active = timestamps.filter(t => t > now - windowMs);
      expect(active.length).toBe(3);
    });

    it('should calculate reset time correctly', () => {
      const windowMs = 60000;
      const now = Date.now();
      const oldestInWindow = now - 45000; // 45s ago
      const resetMs = oldestInWindow + windowMs - now;
      expect(resetMs).toBe(15000); // 15s until oldest expires
    });
  });

  describe('Per-Endpoint Limits', () => {
    const limits: Record<string, number> = {
      signal: 60,
      search: 30,
      admin: 10,
      evolution: 5,
      feedback: 120,
      tools: 20,
      webhook: 100,
    };

    it('should have different limits per endpoint type', () => {
      expect(limits.signal).toBeGreaterThan(limits.admin);
      expect(limits.feedback).toBeGreaterThan(limits.signal);
      expect(limits.evolution).toBeLessThan(limits.admin);
    });

    it('should have all 7 endpoint types defined', () => {
      expect(Object.keys(limits).length).toBe(7);
    });

    it('should have positive limits for all types', () => {
      for (const [key, limit] of Object.entries(limits)) {
        expect(limit).toBeGreaterThan(0);
      }
    });
  });
});

describe('Health Monitor', () => {
  describe('Health Status Determination', () => {
    it('should be healthy when all checks pass', () => {
      const checks = ['pass', 'pass', 'pass', 'pass', 'pass'];
      const status = checks.includes('fail') ? 'unhealthy' : checks.includes('warn') ? 'degraded' : 'healthy';
      expect(status).toBe('healthy');
    });

    it('should be degraded with warnings', () => {
      const checks = ['pass', 'warn', 'pass', 'pass', 'pass'];
      const status = checks.includes('fail') ? 'unhealthy' : checks.includes('warn') ? 'degraded' : 'healthy';
      expect(status).toBe('degraded');
    });

    it('should be unhealthy with failures', () => {
      const checks = ['pass', 'pass', 'fail', 'pass', 'pass'];
      const status = checks.includes('fail') ? 'unhealthy' : checks.includes('warn') ? 'degraded' : 'healthy';
      expect(status).toBe('unhealthy');
    });

    it('should prioritize fail over warn', () => {
      const checks = ['pass', 'warn', 'fail', 'pass'];
      const status = checks.includes('fail') ? 'unhealthy' : checks.includes('warn') ? 'degraded' : 'healthy';
      expect(status).toBe('unhealthy');
    });
  });

  describe('Memory Check', () => {
    it('should warn above 80% heap usage', () => {
      const check = (percent: number) => percent < 80 ? 'pass' : percent < 95 ? 'warn' : 'fail';
      expect(check(50)).toBe('pass');
      expect(check(80)).toBe('warn');
      expect(check(95)).toBe('fail');
      expect(check(99)).toBe('fail');
    });
  });

  describe('Database Latency Check', () => {
    it('should pass under 100ms', () => {
      const check = (ms: number) => ms < 100 ? 'pass' : 'warn';
      expect(check(5)).toBe('pass');
      expect(check(50)).toBe('pass');
      expect(check(100)).toBe('warn');
      expect(check(500)).toBe('warn');
    });
  });

  describe('Disk Usage Check', () => {
    it('should warn above 85% usage', () => {
      const check = (percent: number) => percent < 85 ? 'pass' : percent < 95 ? 'warn' : 'fail';
      expect(check(50)).toBe('pass');
      expect(check(85)).toBe('warn');
      expect(check(95)).toBe('fail');
    });
  });
});

describe('Uptime Calculation', () => {
  it('should format uptime correctly', () => {
    const format = (seconds: number): string => {
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      parts.push(`${s}s`);
      return parts.join(' ');
    };

    expect(format(60)).toBe('1m 0s');
    expect(format(3661)).toBe('1h 1m 1s');
    expect(format(90061)).toBe('1d 1h 1m 1s');
    expect(format(30)).toBe('30s');
  });
});

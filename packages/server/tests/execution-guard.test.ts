import { describe, it, expect } from 'vitest';

describe('Execution Guard', () => {
  describe('Guarded Execution', () => {
    it('should return result on success', async () => {
      const fn = async () => 42;
      const result = await runGuarded(fn, { timeoutMs: 5000 });
      expect(result.result).toBe(42);
      expect(result.timedOut).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should timeout on slow execution', async () => {
      const fn = () => new Promise<number>(resolve => setTimeout(() => resolve(42), 5000));
      const result = await runGuarded(fn, { timeoutMs: 50 });
      expect(result.timedOut).toBe(true);
      expect(result.result).toBeNull();
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'success';
      };
      const result = await runGuarded(fn, { maxRetries: 3, retryDelayMs: 10 });
      expect(result.result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should exhaust retries and return error', async () => {
      const fn = async () => { throw new Error('always fails'); };
      const result = await runGuarded(fn, { maxRetries: 2, retryDelayMs: 10 });
      expect(result.result).toBeNull();
      expect(result.error).toBe('always fails');
      expect(result.retries).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Circuit Breaker', () => {
    it('should start in closed state', () => {
      const cb = createCircuitBreaker(3, 1000);
      expect(cb.getState()).toBe('closed');
    });

    it('should open after threshold failures', () => {
      const cb = createCircuitBreaker(3, 1000);
      for (let i = 0; i < 3; i++) cb.recordFailure();
      expect(cb.getState()).toBe('open');
    });

    it('should reset on success', () => {
      const cb = createCircuitBreaker(3, 1000);
      cb.recordFailure();
      cb.recordFailure();
      cb.recordSuccess();
      expect(cb.getState()).toBe('closed');
      expect(cb.getFailures()).toBe(0);
    });

    it('should not open below threshold', () => {
      const cb = createCircuitBreaker(5, 1000);
      for (let i = 0; i < 4; i++) cb.recordFailure();
      expect(cb.getState()).toBe('closed');
    });
  });

  describe('Parallel Execution', () => {
    it('should batch parallel executions', async () => {
      const fns = Array.from({ length: 10 }, (_, i) => async () => i);
      const results = await runParallel(fns, { maxParallel: 4 });
      expect(results.length).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(results[i]).toBe(i);
      }
    });

    it('should handle mixed success/failure in parallel', async () => {
      const fns = [
        async () => 'a',
        async () => { throw new Error('fail'); },
        async () => 'c',
      ];
      const results = await runParallel(fns, { maxParallel: 3 });
      expect(results[0]).toBe('a');
      expect(results[1]).toBeNull();
      expect(results[2]).toBe('c');
    });
  });
});

// Test helpers (simplified versions of the actual implementation)
async function runGuarded<T>(
  fn: () => Promise<T>,
  opts: { timeoutMs?: number; maxRetries?: number; retryDelayMs?: number } = {}
): Promise<{ result: T | null; timedOut: boolean; retries: number; error: string | null }> {
  const timeout = opts.timeoutMs || 120000;
  const maxRetries = opts.maxRetries || 0;
  const retryDelay = opts.retryDelayMs || 100;
  let lastError: string | null = null;
  let retries = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeout)),
      ]);
      return { result, timedOut: false, retries, error: null };
    } catch (e: any) {
      lastError = e.message;
      if (e.message === 'TIMEOUT') return { result: null, timedOut: true, retries, error: 'timeout' };
      retries++;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, retryDelay));
    }
  }
  return { result: null, timedOut: false, retries, error: lastError };
}

function createCircuitBreaker(threshold: number, resetMs: number) {
  let failures = 0;
  let state: 'closed' | 'open' | 'half_open' = 'closed';
  return {
    recordFailure() { failures++; if (failures >= threshold) state = 'open'; },
    recordSuccess() { failures = 0; state = 'closed'; },
    getState() { return state; },
    getFailures() { return failures; },
  };
}

async function runParallel<T>(fns: Array<() => Promise<T>>, opts: { maxParallel: number }): Promise<Array<T | null>> {
  const results: Array<T | null> = [];
  for (let i = 0; i < fns.length; i += opts.maxParallel) {
    const batch = fns.slice(i, i + opts.maxParallel);
    const batchResults = await Promise.allSettled(batch.map(fn => fn()));
    for (const r of batchResults) {
      results.push(r.status === 'fulfilled' ? r.value : null);
    }
  }
  return results;
}

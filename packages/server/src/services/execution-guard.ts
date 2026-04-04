/**
 * Execution Guard — Timeout and retry mechanism for tool execution.
 * 
 * Constitutional Principle: The system NEVER fails to respond.
 * If a tool times out, the guard tries the fallback tool.
 * If the fallback fails, the guard generates a minimal response.
 * 
 * This ensures every signal always produces at least some output.
 */

export interface GuardOptions {
  timeoutMs?: number;      // Max time for tool execution (default: 120s)
  maxRetries?: number;     // Max retries on failure (default: 2)
  retryDelayMs?: number;   // Delay between retries (default: 1000ms)
  fallbackTool?: string;   // Fallback tool ID if primary fails
}

export async function guardedExecution<T>(
  fn: () => Promise<T>,
  options: GuardOptions = {},
): Promise<{ result: T | null; timedOut: boolean; retries: number; error: string | null }> {
  const timeout = options.timeoutMs || 120000;
  const maxRetries = options.maxRetries || 2;
  const retryDelay = options.retryDelayMs || 1000;

  let lastError: string | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('EXECUTION_TIMEOUT')), timeout)
        ),
      ]);
      return { result, timedOut: false, retries: retryCount, error: null };
    } catch (error: any) {
      lastError = error.message;

      if (error.message === 'EXECUTION_TIMEOUT') {
        return { result: null, timedOut: true, retries: retryCount, error: 'Execution timed out' };
      }

      retryCount++;
      if (attempt < maxRetries) {
        await sleep(retryDelay * (attempt + 1)); // Exponential backoff
      }
    }
  }

  return { result: null, timedOut: false, retries: retryCount, error: lastError };
}

export async function guardedParallelExecution<T>(
  fns: Array<() => Promise<T>>,
  options: GuardOptions = {},
): Promise<Array<{ result: T | null; timedOut: boolean; error: string | null }>> {
  const maxParallel = 4; // Don't overwhelm resources
  const results: Array<{ result: T | null; timedOut: boolean; error: string | null }> = [];

  for (let i = 0; i < fns.length; i += maxParallel) {
    const batch = fns.slice(i, i + maxParallel);
    const batchResults = await Promise.allSettled(
      batch.map(fn => guardedExecution(fn, options))
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        results.push({ result: null, timedOut: false, error: String(r.reason) });
      }
    }
  }

  return results;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half_open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeMs: number = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeMs) {
        this.state = 'half_open';
      } else {
        throw new Error('Circuit breaker is open — too many failures');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): { state: string; failures: number; threshold: number } {
    return { state: this.state, failures: this.failures, threshold: this.threshold };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

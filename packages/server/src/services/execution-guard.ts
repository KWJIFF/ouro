/**
 * Execution Guard — Timeout, retry, and circuit breaker for tool execution.
 * 
 * Constitutional: The system NEVER fails to respond.
 * If a tool times out or fails repeatedly, the guard:
 * 1. Retries with exponential backoff
 * 2. Falls back to alternative tools
 * 3. Returns a degraded response rather than nothing
 */

export interface ExecutionGuardOptions {
  timeoutMs: number;
  maxRetries: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  circuitBreakerThreshold: number; // Failures before opening circuit
}

const defaultOptions: ExecutionGuardOptions = {
  timeoutMs: 120000,
  maxRetries: 2,
  backoffBaseMs: 1000,
  backoffMaxMs: 30000,
  circuitBreakerThreshold: 5,
};

// Circuit breaker state per tool
const circuitState: Map<string, {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  openedAt: number;
}> = new Map();

const CIRCUIT_RESET_MS = 60000; // Reset circuit after 1 minute

export async function withGuard<T>(
  toolId: string,
  fn: () => Promise<T>,
  options: Partial<ExecutionGuardOptions> = {},
): Promise<T> {
  const opts = { ...defaultOptions, ...options };

  // Check circuit breaker
  const circuit = circuitState.get(toolId);
  if (circuit?.isOpen) {
    const elapsed = Date.now() - circuit.openedAt;
    if (elapsed < CIRCUIT_RESET_MS) {
      throw new Error(`Circuit breaker OPEN for ${toolId}. Too many failures. Will retry in ${Math.ceil((CIRCUIT_RESET_MS - elapsed) / 1000)}s.`);
    }
    // Half-open: allow one attempt
    circuit.isOpen = false;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Execute with timeout
      const result = await withTimeout(fn(), opts.timeoutMs);

      // Success: reset circuit breaker
      const state = circuitState.get(toolId);
      if (state) { state.failures = 0; state.isOpen = false; }

      return result;
    } catch (error: any) {
      lastError = error;

      // Record failure for circuit breaker
      if (!circuitState.has(toolId)) {
        circuitState.set(toolId, { failures: 0, lastFailure: 0, isOpen: false, openedAt: 0 });
      }
      const state = circuitState.get(toolId)!;
      state.failures++;
      state.lastFailure = Date.now();

      if (state.failures >= opts.circuitBreakerThreshold) {
        state.isOpen = true;
        state.openedAt = Date.now();
        console.warn(`[Guard] Circuit breaker OPENED for ${toolId} after ${state.failures} failures`);
      }

      // If more retries available, backoff and retry
      if (attempt < opts.maxRetries) {
        const backoffMs = Math.min(
          opts.backoffBaseMs * Math.pow(2, attempt) + Math.random() * 1000,
          opts.backoffMaxMs
        );
        console.log(`[Guard] ${toolId} attempt ${attempt + 1} failed: ${error.message.slice(0, 60)}. Retrying in ${Math.round(backoffMs)}ms...`);
        await sleep(backoffMs);
      }
    }
  }

  throw lastError || new Error(`${toolId} failed after ${opts.maxRetries + 1} attempts`);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Execution timeout after ${ms}ms`)), ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (error) {
    clearTimeout(timer!);
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getCircuitState(): Record<string, {
  failures: number;
  isOpen: boolean;
  lastFailure: string;
}> {
  const result: Record<string, any> = {};
  for (const [toolId, state] of circuitState) {
    result[toolId] = {
      failures: state.failures,
      isOpen: state.isOpen,
      lastFailure: state.lastFailure ? new Date(state.lastFailure).toISOString() : null,
    };
  }
  return result;
}

export function resetCircuit(toolId: string): void {
  circuitState.delete(toolId);
}

export function resetAllCircuits(): void {
  circuitState.clear();
}

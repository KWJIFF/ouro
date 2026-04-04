/**
 * Pipeline Hooks — Pre/post processing hooks for each layer.
 * 
 * Allows plugins and the evolution engine to inject behavior
 * at any point in the signal processing pipeline.
 * 
 * Hook types:
 * - beforeCapture / afterCapture
 * - beforeParse / afterParse
 * - beforePlan / afterPlan
 * - beforeExecute / afterExecute
 * - beforeDeliver / afterDeliver
 * - beforeRecover / afterRecover
 * - beforeEvolve / afterEvolve
 */

type HookPhase =
  | 'beforeCapture' | 'afterCapture'
  | 'beforeParse' | 'afterParse'
  | 'beforePlan' | 'afterPlan'
  | 'beforeExecute' | 'afterExecute'
  | 'beforeDeliver' | 'afterDeliver'
  | 'beforeRecover' | 'afterRecover'
  | 'beforeEvolve' | 'afterEvolve';

type HookFn = (context: HookContext) => Promise<HookContext>;

interface HookContext {
  signalId: string;
  data: any;
  metadata: Record<string, any>;
  abort?: boolean;
  abortReason?: string;
}

interface RegisteredHook {
  id: string;
  phase: HookPhase;
  priority: number;
  handler: HookFn;
  source: string;
}

class PipelineHookRegistry {
  private hooks: Map<HookPhase, RegisteredHook[]> = new Map();

  register(phase: HookPhase, id: string, handler: HookFn, options?: {
    priority?: number;
    source?: string;
  }): void {
    const existing = this.hooks.get(phase) || [];
    existing.push({
      id,
      phase,
      priority: options?.priority || 100,
      handler,
      source: options?.source || 'unknown',
    });
    // Sort by priority (lower = earlier)
    existing.sort((a, b) => a.priority - b.priority);
    this.hooks.set(phase, existing);
  }

  unregister(phase: HookPhase, id: string): void {
    const existing = this.hooks.get(phase) || [];
    this.hooks.set(phase, existing.filter(h => h.id !== id));
  }

  async run(phase: HookPhase, context: HookContext): Promise<HookContext> {
    const hooks = this.hooks.get(phase) || [];
    let ctx = { ...context };

    for (const hook of hooks) {
      try {
        ctx = await hook.handler(ctx);
        if (ctx.abort) {
          console.log(`[Hook] Pipeline aborted by ${hook.id} at ${phase}: ${ctx.abortReason}`);
          break;
        }
      } catch (error: any) {
        console.error(`[Hook] Error in ${hook.id} at ${phase}: ${error.message}`);
        // Hooks should not break the pipeline
      }
    }

    return ctx;
  }

  getRegistered(): Array<{ phase: HookPhase; id: string; priority: number; source: string }> {
    const all: Array<{ phase: HookPhase; id: string; priority: number; source: string }> = [];
    for (const [phase, hooks] of this.hooks) {
      for (const hook of hooks) {
        all.push({ phase, id: hook.id, priority: hook.priority, source: hook.source });
      }
    }
    return all;
  }

  clear(): void {
    this.hooks.clear();
  }
}

export const pipelineHooks = new PipelineHookRegistry();

// === Built-in hooks ===

// Timing hook: measures duration of each pipeline phase
pipelineHooks.register('beforeCapture', 'timing:capture', async (ctx) => {
  ctx.metadata._captureStart = Date.now();
  return ctx;
}, { priority: 1, source: 'system' });

pipelineHooks.register('afterCapture', 'timing:capture', async (ctx) => {
  ctx.metadata._captureDuration = Date.now() - (ctx.metadata._captureStart || Date.now());
  return ctx;
}, { priority: 999, source: 'system' });

pipelineHooks.register('beforeParse', 'timing:parse', async (ctx) => {
  ctx.metadata._parseStart = Date.now();
  return ctx;
}, { priority: 1, source: 'system' });

pipelineHooks.register('afterParse', 'timing:parse', async (ctx) => {
  ctx.metadata._parseDuration = Date.now() - (ctx.metadata._parseStart || Date.now());
  return ctx;
}, { priority: 999, source: 'system' });

pipelineHooks.register('beforeExecute', 'timing:execute', async (ctx) => {
  ctx.metadata._executeStart = Date.now();
  return ctx;
}, { priority: 1, source: 'system' });

pipelineHooks.register('afterExecute', 'timing:execute', async (ctx) => {
  ctx.metadata._executeDuration = Date.now() - (ctx.metadata._executeStart || Date.now());
  return ctx;
}, { priority: 999, source: 'system' });

// Logging hook: logs each phase transition
pipelineHooks.register('afterCapture', 'log:capture', async (ctx) => {
  console.log(`[Pipeline] Signal ${ctx.signalId} captured (${ctx.metadata._captureDuration}ms)`);
  return ctx;
}, { priority: 500, source: 'system' });

pipelineHooks.register('afterParse', 'log:parse', async (ctx) => {
  console.log(`[Pipeline] Signal ${ctx.signalId} parsed: ${ctx.data?.intent_type} (${ctx.metadata._parseDuration}ms)`);
  return ctx;
}, { priority: 500, source: 'system' });

pipelineHooks.register('afterExecute', 'log:execute', async (ctx) => {
  console.log(`[Pipeline] Signal ${ctx.signalId} executed: ${ctx.data?.status} (${ctx.metadata._executeDuration}ms)`);
  return ctx;
}, { priority: 500, source: 'system' });

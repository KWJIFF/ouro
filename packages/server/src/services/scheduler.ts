import { checkAndRunEvolution } from './evolution-engine';
import { buildPersonalModel } from './personal-model';
import { eventBus } from './event-bus';

/**
 * Task Scheduler — Manages periodic background operations.
 * 
 * The meme has metabolic cycles:
 * - Signal processing: immediate (per-signal)
 * - Pattern recovery: after each signal cycle
 * - Evolution: every N signals
 * - Personal model rebuild: every hour
 * - Health check: every 5 minutes
 * - Stale data cleanup: daily
 */

interface ScheduledTask {
  name: string;
  intervalMs: number;
  handler: () => Promise<void>;
  lastRun: number;
  runCount: number;
  errorCount: number;
  enabled: boolean;
}

class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private running = false;

  register(name: string, intervalMs: number, handler: () => Promise<void>): void {
    this.tasks.set(name, {
      name,
      intervalMs,
      handler,
      lastRun: 0,
      runCount: 0,
      errorCount: 0,
      enabled: true,
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    for (const [name, task] of this.tasks) {
      if (!task.enabled) continue;

      const timer = setInterval(async () => {
        if (!task.enabled) return;
        try {
          task.lastRun = Date.now();
          await task.handler();
          task.runCount++;
        } catch (error: any) {
          task.errorCount++;
          console.error(`[Scheduler] Task ${name} failed:`, error.message);
        }
      }, task.intervalMs);

      this.timers.set(name, timer);
      console.log(`[Scheduler] Registered: ${name} (every ${task.intervalMs / 1000}s)`);
    }

    console.log(`[Scheduler] Started with ${this.tasks.size} tasks`);
  }

  stop(): void {
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.running = false;
    console.log('[Scheduler] Stopped');
  }

  enableTask(name: string): void {
    const task = this.tasks.get(name);
    if (task) task.enabled = true;
  }

  disableTask(name: string): void {
    const task = this.tasks.get(name);
    if (task) task.enabled = false;
    const timer = this.timers.get(name);
    if (timer) clearInterval(timer);
  }

  getStatus(): Array<{
    name: string;
    enabled: boolean;
    intervalMs: number;
    lastRun: number;
    runCount: number;
    errorCount: number;
  }> {
    return Array.from(this.tasks.values()).map(t => ({
      name: t.name,
      enabled: t.enabled,
      intervalMs: t.intervalMs,
      lastRun: t.lastRun,
      runCount: t.runCount,
      errorCount: t.errorCount,
    }));
  }

  async runNow(name: string): Promise<void> {
    const task = this.tasks.get(name);
    if (!task) throw new Error(`Task not found: ${name}`);
    task.lastRun = Date.now();
    await task.handler();
    task.runCount++;
  }
}

export const scheduler = new TaskScheduler();

export function initScheduler(): void {
  // Evolution check — every 5 minutes
  scheduler.register('evolution_check', 5 * 60 * 1000, async () => {
    await checkAndRunEvolution();
  });

  // Personal model rebuild — every 30 minutes
  scheduler.register('personal_model_rebuild', 30 * 60 * 1000, async () => {
    const model = await buildPersonalModel();
    eventBus.emit('evolution:event', {
      event: {
        id: 'periodic_model',
        target_layer: 6,
        target_component: 'personal_model' as any,
        change_type: 'weight_update' as any,
        change_detail: { confidence: model.evolution_readiness.model_confidence },
        evidence_count: model.evolution_readiness.total_signals,
        expected_improvement: null,
        actual_improvement: null,
        rolled_back: false,
        created_at: new Date().toISOString(),
      },
    });
  });

  // Health ping — every minute
  scheduler.register('health_ping', 60 * 1000, async () => {
    // Just a heartbeat for monitoring
    eventBus.emit('system:startup', { version: '0.3.0', tools: 26 });
  });

  scheduler.start();
}

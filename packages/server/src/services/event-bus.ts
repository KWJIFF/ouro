import { EventEmitter } from 'events';
import type { CapturedSignal, ParsedIntent, ExecutionPlan, Artifact, SignalPattern, EvolutionEvent, Feedback } from '@ouro/core';

/**
 * Event Bus — The nervous system of the meme organism.
 * 
 * Every layer emits events as it operates. Other layers and external
 * systems can subscribe to these events for real-time awareness.
 * 
 * This is the foundation for:
 * - WebSocket real-time updates
 * - Background worker triggers
 * - Plugin event hooks
 * - Analytics event streaming
 * - Evolution trigger conditions
 */

export interface OuroEvents {
  // Layer 1: Signal Capture
  'signal:captured': { signal: CapturedSignal };
  'signal:processing': { signalId: string; stage: string };
  'signal:completed': { signalId: string; status: string };
  'signal:failed': { signalId: string; error: string };

  // Layer 2: Intent Parsing
  'intent:parsed': { signalId: string; intent: ParsedIntent };
  'intent:clarification_needed': { signalId: string; question: string };
  'intent:corrected': { signalId: string; originalType: string; correctedType: string };

  // Layer 3: Execution
  'plan:created': { signalId: string; planId: string; steps: number };
  'step:started': { signalId: string; planId: string; stepId: string; tool: string };
  'step:completed': { signalId: string; planId: string; stepId: string; tool: string; durationMs: number };
  'step:failed': { signalId: string; planId: string; stepId: string; tool: string; error: string };
  'plan:completed': { signalId: string; planId: string; status: string; durationMs: number };

  // Layer 4: Delivery
  'artifact:created': { signalId: string; artifact: Artifact };
  'artifact:versioned': { signalId: string; artifactId: string; version: number };
  'feedback:received': { signalId: string; feedback: Feedback };

  // Layer 5: Recovery
  'patterns:extracted': { signalId: string; patterns: SignalPattern[]; count: number };
  'connection:created': { sourceId: string; targetId: string; type: string; strength: number };

  // Layer 6: Evolution
  'evolution:started': { cycleNumber: number };
  'evolution:event': { event: EvolutionEvent };
  'evolution:completed': { cycleNumber: number; eventsGenerated: number };
  'phase:transition': { from: string; to: string };

  // Layer 7: Sovereignty (future)
  'autonomous:signal_generated': { content: string; confidence: number };

  // System
  'system:startup': { version: string; tools: number };
  'system:shutdown': { reason: string };
  'tool:registered': { toolId: string; name: string };
  'tool:unregistered': { toolId: string };
  'error:unhandled': { error: string; context: string };
}

class OuroEventBus extends EventEmitter {
  private eventLog: Array<{ type: string; data: any; timestamp: string }> = [];
  private maxLogSize = 10000;
  private subscriberMap: Map<string, Set<string>> = new Map();

  emit<K extends keyof OuroEvents>(event: K, data: OuroEvents[K]): boolean {
    // Log every event
    this.eventLog.push({
      type: event,
      data,
      timestamp: new Date().toISOString(),
    });

    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize / 2);
    }

    return super.emit(event, data);
  }

  on<K extends keyof OuroEvents>(event: K, listener: (data: OuroEvents[K]) => void): this {
    return super.on(event, listener);
  }

  once<K extends keyof OuroEvents>(event: K, listener: (data: OuroEvents[K]) => void): this {
    return super.once(event, listener);
  }

  getRecentEvents(limit: number = 100, type?: string): Array<{ type: string; data: any; timestamp: string }> {
    const filtered = type
      ? this.eventLog.filter(e => e.type === type)
      : this.eventLog;
    return filtered.slice(-limit);
  }

  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.eventLog) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    return counts;
  }

  getEventRate(windowMs: number = 60000): number {
    const cutoff = Date.now() - windowMs;
    return this.eventLog.filter(e => new Date(e.timestamp).getTime() > cutoff).length;
  }
}

export const eventBus = new OuroEventBus();
eventBus.setMaxListeners(100);

// Wire event bus to WebSocket broadcasting
export function wireEventBusToWebSocket(): void {
  // Dynamically import to avoid circular dependency
  const wsEvents: Array<keyof OuroEvents> = [
    'signal:captured', 'signal:completed', 'signal:failed',
    'intent:parsed', 'intent:clarification_needed',
    'plan:created', 'step:started', 'step:completed', 'step:failed', 'plan:completed',
    'artifact:created', 'feedback:received',
    'patterns:extracted', 'evolution:event', 'phase:transition',
    'tool:registered',
  ];

  let emitToAll: ((event: string, data: any) => void) | null = null;

  // Lazy load the emitToAll function
  const getEmitter = () => {
    if (!emitToAll) {
      try {
        const ws = require('../websocket/server');
        emitToAll = ws.emitToAll;
      } catch { /* not ready yet */ }
    }
    return emitToAll;
  };

  for (const event of wsEvents) {
    eventBus.on(event, (data) => {
      const emit = getEmitter();
      if (emit) emit(event, data);
    });
  }
}

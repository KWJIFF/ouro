/**
 * Telemetry Service — Anonymous system metrics for self-improvement.
 * 
 * Tracks operational metrics WITHOUT capturing signal content.
 * This data feeds the evolution engine's understanding of system health.
 * 
 * Collected:
 * - Signal count by modality (text: 42, voice: 8, ...)
 * - Intent distribution (create: 30%, explore: 25%, ...)
 * - Tool usage frequency and success rates
 * - Average processing times per layer
 * - Error rates by layer and type
 * - Evolution cycle frequency and impact
 * - Pattern density over time
 * 
 * NOT collected:
 * - Signal content
 * - User identity
 * - Artifact content
 * - IP addresses
 */

interface TelemetryCounter {
  value: number;
  first_seen: number;
  last_updated: number;
}

interface TelemetryHistogram {
  values: number[];
  min: number;
  max: number;
  sum: number;
  count: number;
}

class TelemetryService {
  private counters: Map<string, TelemetryCounter> = new Map();
  private histograms: Map<string, TelemetryHistogram> = new Map();
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.OURO_TELEMETRY !== 'false';
  }

  // === Counters ===
  increment(name: string, amount: number = 1): void {
    if (!this.enabled) return;
    const counter = this.counters.get(name) || { value: 0, first_seen: Date.now(), last_updated: 0 };
    counter.value += amount;
    counter.last_updated = Date.now();
    this.counters.set(name, counter);
  }

  getCounter(name: string): number {
    return this.counters.get(name)?.value || 0;
  }

  // === Histograms (for latency, durations) ===
  record(name: string, value: number): void {
    if (!this.enabled) return;
    const hist = this.histograms.get(name) || { values: [], min: Infinity, max: -Infinity, sum: 0, count: 0 };
    hist.values.push(value);
    if (hist.values.length > 10000) hist.values = hist.values.slice(-5000); // Keep last 5K
    hist.min = Math.min(hist.min, value);
    hist.max = Math.max(hist.max, value);
    hist.sum += value;
    hist.count++;
    this.histograms.set(name, hist);
  }

  getHistogram(name: string): { min: number; max: number; avg: number; p50: number; p95: number; p99: number; count: number } | null {
    const hist = this.histograms.get(name);
    if (!hist || hist.count === 0) return null;

    const sorted = [...hist.values].sort((a, b) => a - b);
    return {
      min: hist.min,
      max: hist.max,
      avg: hist.sum / hist.count,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      count: hist.count,
    };
  }

  // === Convenience methods ===
  signalCaptured(modality: string): void {
    this.increment('signals.total');
    this.increment(`signals.modality.${modality}`);
  }

  intentParsed(type: string, durationMs: number): void {
    this.increment('intents.total');
    this.increment(`intents.type.${type}`);
    this.record('intents.duration_ms', durationMs);
  }

  toolExecuted(toolId: string, success: boolean, durationMs: number): void {
    this.increment('tools.total');
    this.increment(`tools.${toolId}.total`);
    if (success) this.increment(`tools.${toolId}.success`);
    else this.increment(`tools.${toolId}.failure`);
    this.record(`tools.${toolId}.duration_ms`, durationMs);
    this.record('tools.duration_ms', durationMs);
  }

  artifactBuilt(type: string): void {
    this.increment('artifacts.total');
    this.increment(`artifacts.type.${type}`);
  }

  feedbackReceived(action: string, satisfaction: number): void {
    this.increment('feedback.total');
    this.increment(`feedback.action.${action}`);
    this.record('feedback.satisfaction', satisfaction);
  }

  evolutionRan(eventCount: number, durationMs: number): void {
    this.increment('evolution.cycles');
    this.increment('evolution.events', eventCount);
    this.record('evolution.duration_ms', durationMs);
  }

  pipelineError(layer: number, errorType: string): void {
    this.increment('errors.total');
    this.increment(`errors.layer.${layer}`);
    this.increment(`errors.type.${errorType}`);
  }

  // === Export ===
  getReport(): Record<string, any> {
    const report: Record<string, any> = {};

    // Counters
    report.counters = {};
    for (const [name, counter] of this.counters) {
      report.counters[name] = counter.value;
    }

    // Histograms
    report.histograms = {};
    for (const [name] of this.histograms) {
      report.histograms[name] = this.getHistogram(name);
    }

    return report;
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}

export const telemetry = new TelemetryService();

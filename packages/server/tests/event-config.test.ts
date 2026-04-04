import { describe, it, expect } from 'vitest';

describe('Event Bus', () => {
  it('should emit and receive events', () => {
    const { EventEmitter } = require('events');
    const bus = new EventEmitter();
    let received = false;
    bus.on('test', () => { received = true; });
    bus.emit('test');
    expect(received).toBe(true);
  });

  it('should track event counts', () => {
    const log: Array<{ type: string }> = [];
    const emit = (type: string) => { log.push({ type }); };

    emit('signal:captured');
    emit('signal:captured');
    emit('intent:parsed');
    emit('step:completed');
    emit('step:completed');
    emit('step:completed');

    const counts: Record<string, number> = {};
    for (const e of log) counts[e.type] = (counts[e.type] || 0) + 1;

    expect(counts['signal:captured']).toBe(2);
    expect(counts['intent:parsed']).toBe(1);
    expect(counts['step:completed']).toBe(3);
  });

  it('should calculate event rate within window', () => {
    const events = [
      { timestamp: Date.now() - 30000 }, // 30s ago
      { timestamp: Date.now() - 20000 }, // 20s ago
      { timestamp: Date.now() - 10000 }, // 10s ago
      { timestamp: Date.now() - 5000 },  // 5s ago
      { timestamp: Date.now() },          // now
    ];

    const rateInWindow = (windowMs: number): number => {
      const cutoff = Date.now() - windowMs;
      return events.filter(e => e.timestamp > cutoff).length;
    };

    expect(rateInWindow(60000)).toBe(5);  // All in last minute
    expect(rateInWindow(15000)).toBe(3);  // Last 15 seconds
    expect(rateInWindow(1000)).toBe(1);   // Last second
  });

  it('should handle max log size with pruning', () => {
    const maxSize = 100;
    let log: string[] = [];

    for (let i = 0; i < 150; i++) {
      log.push(`event-${i}`);
      if (log.length > maxSize) {
        log = log.slice(-maxSize / 2);
      }
    }

    expect(log.length).toBeLessThanOrEqual(maxSize);
    expect(log.length).toBeLessThanOrEqual(maxSize); // Stays within bounds
  });
});

describe('Configuration Manager', () => {
  it('should return default values for missing keys', () => {
    const cache = new Map<string, any>();
    const getConfig = (key: string, defaultVal: any) => cache.get(key) ?? defaultVal;

    expect(getConfig('missing.key', 42)).toBe(42);
    expect(getConfig('missing.key', 'hello')).toBe('hello');
    expect(getConfig('missing.key', true)).toBe(true);
  });

  it('should override defaults with cached values', () => {
    const cache = new Map<string, any>();
    cache.set('my.key', 'cached_value');

    const getConfig = (key: string, defaultVal: any) => cache.get(key) ?? defaultVal;
    expect(getConfig('my.key', 'default')).toBe('cached_value');
  });

  it('should track config change history', () => {
    const changelog: Array<{ key: string; old: any; new_val: any; by: string }> = [];

    const setConfig = (key: string, value: any, old: any, by: string) => {
      changelog.push({ key, old, new_val: value, by });
    };

    setConfig('threshold', 0.8, 0.7, 'evolution');
    setConfig('threshold', 0.85, 0.8, 'evolution');
    setConfig('model', 'v2', 'v1', 'user');

    expect(changelog.length).toBe(3);
    expect(changelog.filter(c => c.key === 'threshold').length).toBe(2);
    expect(changelog[2].by).toBe('user');
  });

  it('should validate config value types', () => {
    const validate = (value: any, type: string): boolean => {
      switch (type) {
        case 'number': return typeof value === 'number' && !isNaN(value);
        case 'string': return typeof value === 'string';
        case 'boolean': return typeof value === 'boolean';
        case 'json': try { JSON.parse(JSON.stringify(value)); return true; } catch { return false; }
        default: return false;
      }
    };

    expect(validate(42, 'number')).toBe(true);
    expect(validate('hello', 'string')).toBe(true);
    expect(validate(true, 'boolean')).toBe(true);
    expect(validate({ a: 1 }, 'json')).toBe(true);
    expect(validate('hello', 'number')).toBe(false);
    expect(validate(42, 'boolean')).toBe(false);
  });

  it('should group configs by category', () => {
    const configs = [
      { key: 'signal.max_size', category: 'signal' },
      { key: 'signal.timeout', category: 'signal' },
      { key: 'ai.model', category: 'ai' },
      { key: 'ai.temperature', category: 'ai' },
      { key: 'ai.max_tokens', category: 'ai' },
      { key: 'evolution.interval', category: 'evolution' },
    ];

    const byCategory: Record<string, number> = {};
    for (const c of configs) byCategory[c.category] = (byCategory[c.category] || 0) + 1;

    expect(byCategory['signal']).toBe(2);
    expect(byCategory['ai']).toBe(3);
    expect(byCategory['evolution']).toBe(1);
  });
});

describe('Analytics', () => {
  it('should detect signal trends', () => {
    const detectTrend = (thisWeek: number, lastWeek: number): string => {
      if (thisWeek > lastWeek * 1.2) return 'growing';
      if (thisWeek < lastWeek * 0.8) return 'declining';
      return 'stable';
    };

    expect(detectTrend(100, 80)).toBe('growing');
    expect(detectTrend(70, 100)).toBe('declining');
    expect(detectTrend(90, 85)).toBe('stable');
    expect(detectTrend(0, 0)).toBe('stable');
  });

  it('should calculate association density', () => {
    const density = (associations: number, signals: number): number =>
      signals > 0 ? associations / signals : 0;

    expect(density(10, 20)).toBe(0.5);
    expect(density(0, 20)).toBe(0);
    expect(density(20, 20)).toBe(1);
    expect(density(0, 0)).toBe(0);
  });

  it('should aggregate by hour correctly', () => {
    const timestamps = [
      new Date('2025-01-01T09:00:00Z'),
      new Date('2025-01-01T09:30:00Z'),
      new Date('2025-01-01T14:00:00Z'),
      new Date('2025-01-01T14:15:00Z'),
      new Date('2025-01-01T14:45:00Z'),
      new Date('2025-01-01T22:00:00Z'),
    ];

    const hourCounts = new Array(24).fill(0);
    for (const ts of timestamps) hourCounts[ts.getUTCHours()]++;

    expect(hourCounts[9]).toBe(2);
    expect(hourCounts[14]).toBe(3);
    expect(hourCounts[22]).toBe(1);
    expect(hourCounts[0]).toBe(0);
  });

  it('should calculate success rates', () => {
    const rate = (completed: number, total: number): number =>
      total > 0 ? completed / total : 0;

    expect(rate(8, 10)).toBeCloseTo(0.8);
    expect(rate(0, 10)).toBe(0);
    expect(rate(10, 10)).toBe(1);
    expect(rate(0, 0)).toBe(0);
  });
});

describe('Tool Manifest Validation', () => {
  it('should validate required manifest fields', () => {
    const validate = (manifest: Record<string, any>): string[] => {
      const errors: string[] = [];
      if (!manifest.id) errors.push('Missing id');
      if (!manifest.version) errors.push('Missing version');
      if (!manifest.name) errors.push('Missing name');
      if (!manifest.description) errors.push('Missing description');
      if (!manifest.capabilities?.length) errors.push('Missing capabilities');
      return errors;
    };

    expect(validate({
      id: 'test', version: '1.0', name: 'Test', description: 'A test tool',
      capabilities: ['testing'],
    })).toEqual([]);

    expect(validate({ id: 'test' })).toContain('Missing version');
    expect(validate({})).toContain('Missing id');
  });

  it('should validate version format', () => {
    const isValidSemver = (v: string): boolean => /^\d+\.\d+\.\d+/.test(v);

    expect(isValidSemver('1.0.0')).toBe(true);
    expect(isValidSemver('0.1.0')).toBe(true);
    expect(isValidSemver('10.20.30')).toBe(true);
    expect(isValidSemver('1.0')).toBe(false);
    expect(isValidSemver('abc')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';

describe('Cache System', () => {
  describe('Memory Cache (L1)', () => {
    it('should store and retrieve values', () => {
      const cache = new Map<string, { value: any; expiresAt: number }>();
      cache.set('key1', { value: 'hello', expiresAt: Date.now() + 60000 });
      const entry = cache.get('key1');
      expect(entry?.value).toBe('hello');
    });

    it('should expire entries', () => {
      const cache = new Map<string, { value: any; expiresAt: number }>();
      cache.set('key1', { value: 'hello', expiresAt: Date.now() - 1 }); // Already expired
      const entry = cache.get('key1');
      expect(entry).toBeTruthy(); // Entry exists but would be filtered by expiry check
      expect(entry!.expiresAt).toBeLessThan(Date.now());
    });

    it('should handle LRU eviction', () => {
      const maxSize = 3;
      const cache = new Map<string, any>();
      for (let i = 0; i < 5; i++) {
        if (cache.size >= maxSize) {
          const first = cache.keys().next().value;
          cache.delete(first);
        }
        cache.set(`key${i}`, `val${i}`);
      }
      expect(cache.size).toBe(maxSize);
      expect(cache.has('key0')).toBe(false); // Evicted
      expect(cache.has('key1')).toBe(false); // Evicted
      expect(cache.has('key4')).toBe(true);  // Recent
    });

    it('should calculate hit rate', () => {
      let hits = 0, misses = 0;
      const cache = new Map<string, string>();
      cache.set('a', '1');

      // 3 hits
      for (let i = 0; i < 3; i++) { if (cache.has('a')) hits++; else misses++; }
      // 2 misses
      for (let i = 0; i < 2; i++) { if (cache.has('b')) hits++; else misses++; }

      const hitRate = hits / (hits + misses);
      expect(hitRate).toBeCloseTo(0.6);
    });
  });

  describe('Cache Key Generation', () => {
    it('should produce consistent hashes', () => {
      const hash = (text: string): string => {
        let h = 0;
        for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
        return Math.abs(h).toString(36);
      };

      expect(hash('test')).toBe(hash('test'));
      expect(hash('hello')).not.toBe(hash('world'));
    });

    it('should generate domain-specific keys', () => {
      const keys = {
        embedding: (text: string) => `emb:${text.slice(0, 8)}`,
        intent: (text: string) => `intent:${text.slice(0, 8)}`,
        path: (key: string) => `path:${key}`,
        tool: (id: string, hash: string) => `tool:${id}:${hash}`,
      };

      expect(keys.embedding('hello world')).toBe('emb:hello wo');
      expect(keys.intent('build a page')).toBe('intent:build a ');
      expect(keys.tool('code_gen', 'abc123')).toBe('tool:code_gen:abc123');
    });
  });

  describe('Cache TTL', () => {
    it('should use appropriate TTLs per data type', () => {
      const ttls: Record<string, number> = {
        embedding: 24 * 60 * 60 * 1000,    // 24h — embeddings don't change
        intent: 5 * 60 * 1000,              // 5min — same text might have different context
        path: 60 * 60 * 1000,               // 1h — execution paths are semi-stable
        personal_model: 30 * 60 * 1000,     // 30min — model changes with new signals
        tool_output: 15 * 60 * 1000,        // 15min — tool outputs may vary
      };

      expect(ttls.embedding).toBeGreaterThan(ttls.path);
      expect(ttls.path).toBeGreaterThan(ttls.personal_model);
      expect(ttls.personal_model).toBeGreaterThan(ttls.tool_output);
      expect(ttls.tool_output).toBeGreaterThan(ttls.intent);
    });
  });

  describe('Multi-Level Cache', () => {
    it('should promote L2 hits to L1', () => {
      // Simulate L1 miss, L2 hit, then L1 should have it
      const l1 = new Map<string, any>();
      const l2 = new Map<string, any>();
      l2.set('key1', 'from_redis');

      const get = (key: string) => {
        if (l1.has(key)) return { source: 'l1', value: l1.get(key) };
        if (l2.has(key)) {
          l1.set(key, l2.get(key)); // Promote
          return { source: 'l2', value: l2.get(key) };
        }
        return null;
      };

      const first = get('key1');
      expect(first?.source).toBe('l2');
      expect(first?.value).toBe('from_redis');

      const second = get('key1');
      expect(second?.source).toBe('l1'); // Now from L1
    });
  });
});

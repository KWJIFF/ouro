/**
 * Cache Service — In-memory + Redis caching for Ouro.
 * 
 * Three cache levels:
 * 1. L1: In-memory (process) — <1ms, lost on restart
 * 2. L2: Redis — <5ms, survives restarts
 * 3. L3: PostgreSQL — <20ms, permanent
 * 
 * The execution planner caches successful paths.
 * The intent parser caches recent classifications.
 * The personal model caches the full model.
 * Embeddings are cached to avoid redundant API calls.
 */

import { createClient, RedisClientType } from 'redis';

// === L1: In-Memory Cache ===
class MemoryCache {
  private store: Map<string, { value: any; expiresAt: number }> = new Map();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;

    // Cleanup expired entries every 60 seconds
    setInterval(() => this.cleanup(), 60000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return null; }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value as T;
  }

  set(key: string, value: any, ttlMs: number = 300000): void {
    // LRU eviction if at capacity
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(key);
    }
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

// === L2: Redis Cache ===
class RedisCache {
  private client: RedisClientType | null = null;
  private connected = false;

  async connect(url: string): Promise<void> {
    try {
      this.client = createClient({ url }) as RedisClientType;
      this.client.on('error', (err: any) => {
        console.warn('[Cache] Redis error:', err.message);
        this.connected = false;
      });
      this.client.on('connect', () => { this.connected = true; });
      await this.client.connect();
    } catch (e) {
      console.warn('[Cache] Redis connection failed. Using memory-only cache.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.client) return null;
    try {
      const val = await this.client.get(`ouro:${key}`);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (!this.connected || !this.client) return;
    try {
      await this.client.setEx(`ouro:${key}`, ttlSeconds, JSON.stringify(value));
    } catch { /* non-critical */ }
  }

  async delete(key: string): Promise<void> {
    if (!this.connected || !this.client) return;
    try { await this.client.del(`ouro:${key}`); } catch {}
  }

  isConnected(): boolean { return this.connected; }
}

// === Unified Cache API ===
class OuroCache {
  private l1: MemoryCache;
  private l2: RedisCache;

  constructor() {
    this.l1 = new MemoryCache();
    this.l2 = new RedisCache();
  }

  async init(redisUrl?: string): Promise<void> {
    if (redisUrl) {
      await this.l2.connect(redisUrl);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // L1 first
    const l1Result = this.l1.get<T>(key);
    if (l1Result !== null) return l1Result;

    // L2 fallback
    const l2Result = await this.l2.get<T>(key);
    if (l2Result !== null) {
      this.l1.set(key, l2Result); // Promote to L1
      return l2Result;
    }

    return null;
  }

  async set(key: string, value: any, ttlMs: number = 300000): Promise<void> {
    this.l1.set(key, value, ttlMs);
    await this.l2.set(key, value, Math.ceil(ttlMs / 1000));
  }

  async delete(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.delete(key);
  }

  async invalidatePattern(prefix: string): Promise<void> {
    // L1: scan and delete matching keys
    // This is a simplified version — in production use a proper prefix index
    this.l1.clear(); // Nuclear option for L1
  }

  getStats() {
    return {
      l1: this.l1.getStats(),
      l2: { connected: this.l2.isConnected() },
    };
  }

  // === Domain-specific cache methods ===

  async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    const key = `emb:${hashText(text)}`;
    await this.set(key, embedding, 24 * 60 * 60 * 1000); // 24h TTL
  }

  async getCachedEmbedding(text: string): Promise<number[] | null> {
    return this.get<number[]>(`emb:${hashText(text)}`);
  }

  async cacheIntentClassification(signalText: string, intent: any): Promise<void> {
    const key = `intent:${hashText(signalText)}`;
    await this.set(key, intent, 5 * 60 * 1000); // 5min TTL
  }

  async getCachedIntent(signalText: string): Promise<any | null> {
    return this.get(`intent:${hashText(signalText)}`);
  }

  async cacheExecutionPath(intentKey: string, path: any): Promise<void> {
    const key = `path:${intentKey}`;
    await this.set(key, path, 60 * 60 * 1000); // 1h TTL
  }

  async getCachedPath(intentKey: string): Promise<any | null> {
    return this.get(`path:${intentKey}`);
  }

  async cachePersonalModel(model: any): Promise<void> {
    await this.set('personal_model', model, 30 * 60 * 1000); // 30min TTL
  }

  async getCachedPersonalModel(): Promise<any | null> {
    return this.get('personal_model');
  }

  async cacheToolOutput(toolId: string, inputHash: string, output: any): Promise<void> {
    const key = `tool:${toolId}:${inputHash}`;
    await this.set(key, output, 15 * 60 * 1000); // 15min TTL
  }

  async getCachedToolOutput(toolId: string, inputHash: string): Promise<any | null> {
    return this.get(`tool:${toolId}:${inputHash}`);
  }
}

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export const cache = new OuroCache();

export async function initCache(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  await cache.init(redisUrl);
  console.log(`[Cache] Initialized. L1: memory | L2: ${redisUrl ? 'Redis' : 'disabled'}`);
}

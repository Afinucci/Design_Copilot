interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }

    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  set<T>(key: string, data: T, customTTL?: number): void {
    const ttl = customTTL || this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    this.cache.set(key, entry);
    console.log(`📦 Cache: Stored entry for key: ${key} (TTL: ${ttl}ms)`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`📦 Cache: Miss for key: ${key}`);
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      console.log(`📦 Cache: Expired entry removed for key: ${key}`);
      this.cache.delete(key);
      return null;
    }

    console.log(`📦 Cache: Hit for key: ${key}`);
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`📦 Cache: Deleted entry for key: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`📦 Cache: Cleared ${size} entries`);
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { total: number; expired: number; active: number } {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return { total: this.cache.size, expired, active };
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`📦 Cache: Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  // Create cache key from query and parameters
  static createKey(query: string, params?: Record<string, any>): string {
    const paramsStr = params ? JSON.stringify(params, Object.keys(params).sort()) : '';
    return `${query}|${paramsStr}`;
  }
}

// Singleton instance
export const queryCache = new QueryCache();
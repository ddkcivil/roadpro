/**
 * Utility functions for caching and optimizing data fetching
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items to cache
}

export class DataCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL
  private static readonly MAX_SIZE = 100; // Max 100 items

  /**
   * Get cached data if it exists and hasn't expired
   */
  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set data in cache with TTL
   */
  static set(key: string, data: any, options?: CacheOptions): void {
    const ttl = options?.ttl ?? this.DEFAULT_TTL;
    const now = Date.now();

    // If cache is at max size, remove oldest item
    if (this.cache.size >= (options?.maxSize ?? this.MAX_SIZE)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { data, timestamp: now, ttl });
  }

  /**
   * Delete data from cache
   */
  static delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Check if data exists in cache and is not expired
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache size
   */
  static size(): number {
    return this.cache.size;
  }

  /**
   * Get cache keys
   */
  static keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Debounce function to limit how often a function is called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function to limit how often a function is called
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoize function to cache results of expensive function calls
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, any>();
  
  return function (...args: Parameters<T>): any {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    return result;
  } as T;
}

/**
 * Fetch with caching
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // Check cache first
  const cached = DataCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch data
  const data = await fetcher();
  
  // Cache the result
  DataCache.set(key, data, options);
  
  return data;
}

/**
 * Get a unique cache key based on parameters
 */
export function getCacheKey(prefix: string, params?: Record<string, any>): string {
  if (!params) {
    return prefix;
  }
  
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);
  
  return `${prefix}:${JSON.stringify(sortedParams)}`;
}
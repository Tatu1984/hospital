import Redis from 'ioredis';
import { logger } from '../utils/logger';

class RedisService {
  private client: Redis | null = null;
  private isAvailable: boolean = false;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.warn('Redis connection failed after 3 retries. Operating without cache.');
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isAvailable = true;
      });

      this.client.on('error', (error) => {
        logger.warn('Redis connection error:', error.message);
        this.isAvailable = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isAvailable = false;
      });

      // Attempt to connect
      this.client.connect().catch((error) => {
        logger.warn('Failed to connect to Redis:', error.message);
        this.isAvailable = false;
      });
    } catch (error) {
      logger.warn('Redis initialization error:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache (default TTL: 5 minutes)
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.isAvailable || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttlSeconds, serialized);
      logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
      return true;
    } catch (error) {
      logger.warn(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set value with expiry time (alias for set with explicit name)
   */
  async setWithExpiry(key: string, value: any, ttlSeconds: number): Promise<boolean> {
    return this.set(key, value, ttlSeconds);
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      logger.warn(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<boolean> {
    if (!this.isAvailable || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        logger.debug(`Cache deleted pattern: ${pattern} (${keys.length} keys)`);
      }
      return true;
    } catch (error) {
      logger.warn(`Redis delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Cache wrapper for API responses
   * If cached data exists, return it. Otherwise, execute the function and cache the result.
   */
  async cacheWrapper<T>(
    key: string,
    ttlSeconds: number,
    fetchFunction: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache first
    const cachedData = await this.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }

    // If not in cache, execute the function
    const freshData = await fetchFunction();

    // Cache the result (don't await, let it happen in background)
    this.set(key, freshData, ttlSeconds).catch((error) => {
      logger.warn(`Failed to cache data for key ${key}:`, error);
    });

    return freshData;
  }

  /**
   * Generate a cache key for requests
   */
  generateKey(prefix: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|');

    return sortedParams ? `${prefix}:${sortedParams}` : prefix;
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Gracefully close the connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis disconnected');
    }
  }
}

// Export singleton instance
const redisService = new RedisService();

export default redisService;
export { redisService };

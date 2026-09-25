import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

class RedisService {
  private get client() {
    return getRedisClient();
  }

  // ─── Basic ops ────────────────────────────────────────────────
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err) {
      logger.error({ err, key }, 'Redis GET error');
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      logger.error({ err, key }, 'Redis SET error');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      logger.error({ err, key }, 'Redis DEL error');
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      logger.error({ err, pattern }, 'Redis DEL pattern error');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      logger.error({ err, key }, 'Redis EXISTS error');
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
    } catch (err) {
      logger.error({ err, key }, 'Redis EXPIRE error');
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (err) {
      logger.error({ err, key }, 'Redis TTL error');
      return -1;
    }
  }

  // ─── JSON helpers ─────────────────────────────────────────────
  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  // ─── Increment ────────────────────────────────────────────────
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (err) {
      logger.error({ err, key }, 'Redis INCR error');
      return 0;
    }
  }

  async incrBy(key: string, amount: number): Promise<number> {
    try {
      return await this.client.incrby(key, amount);
    } catch (err) {
      logger.error({ err, key }, 'Redis INCRBY error');
      return 0;
    }
  }

  // ─── Hash ops ─────────────────────────────────────────────────
  async hset(key: string, field: string, value: string): Promise<void> {
    try {
      await this.client.hset(key, field, value);
    } catch (err) {
      logger.error({ err, key }, 'Redis HSET error');
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (err) {
      logger.error({ err, key }, 'Redis HGET error');
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      const result = await this.client.hgetall(key);
      return Object.keys(result).length ? result : null;
    } catch (err) {
      logger.error({ err, key }, 'Redis HGETALL error');
      return null;
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    try {
      await this.client.hdel(key, field);
    } catch (err) {
      logger.error({ err, key }, 'Redis HDEL error');
    }
  }

  // ─── Set ops ──────────────────────────────────────────────────
  async sadd(key: string, ...members: string[]): Promise<void> {
    try {
      await this.client.sadd(key, ...members);
    } catch (err) {
      logger.error({ err, key }, 'Redis SADD error');
    }
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    try {
      await this.client.srem(key, ...members);
    } catch (err) {
      logger.error({ err, key }, 'Redis SREM error');
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (err) {
      logger.error({ err, key }, 'Redis SMEMBERS error');
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      return (await this.client.sismember(key, member)) === 1;
    } catch (err) {
      logger.error({ err, key }, 'Redis SISMEMBER error');
      return false;
    }
  }

  // ─── Sorted Set (leaderboards) ────────────────────────────────
  async zadd(key: string, score: number, member: string): Promise<void> {
    try {
      await this.client.zadd(key, score, member);
    } catch (err) {
      logger.error({ err, key }, 'Redis ZADD error');
    }
  }

  async zincrby(key: string, increment: number, member: string): Promise<void> {
    try {
      await this.client.zincrby(key, increment, member);
    } catch (err) {
      logger.error({ err, key }, 'Redis ZINCRBY error');
    }
  }

  async zrank(key: string, member: string): Promise<number | null> {
    try {
      const rank = await this.client.zrevrank(key, member);
      return rank !== null ? rank + 1 : null;
    } catch (err) {
      logger.error({ err, key }, 'Redis ZRANK error');
      return null;
    }
  }

  async zrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    try {
      if (withScores) {
        return await this.client.zrevrange(key, start, stop, 'WITHSCORES');
      }
      return await this.client.zrevrange(key, start, stop);
    } catch (err) {
      logger.error({ err, key }, 'Redis ZRANGE error');
      return [];
    }
  }

  async zscore(key: string, member: string): Promise<string | null> {
    try {
      return await this.client.zscore(key, member);
    } catch (err) {
      logger.error({ err, key }, 'Redis ZSCORE error');
      return null;
    }
  }

  // ─── Pub/Sub ──────────────────────────────────────────────────
  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.client.publish(channel, message);
    } catch (err) {
      logger.error({ err, channel }, 'Redis PUBLISH error');
    }
  }
}

export const redisService = new RedisService();

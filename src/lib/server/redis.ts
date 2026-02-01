import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Use ioredis - works with both Node.js and Bun
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL);
  }
  return redis;
}

// Rate limiting (the only thing we use Redis for now)
export async function checkRateLimit(
  ip: string,
  type: "read" | "write"
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const r = getRedis();
    const key = `rate:${type}:${ip}`;
    const limit = type === "write" ? 10 : 60;
    
    const current = await r.incr(key);
    
    if (current === 1) {
      await r.expire(key, 60); // 60 second window
    }

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  } catch (error) {
    // If Redis is unavailable, allow the request but log the error
    console.error("Rate limit check failed (Redis unavailable):", error);
    return { allowed: true, remaining: -1 };
  }
}

// Cached stats (thread and post counts)
const STATS_CACHE_KEY = "stats:counts";
const STATS_CACHE_TTL = 15; // 15 seconds - short enough to show liveliness

export interface SiteStats {
  threadCount: number;
  postCount: number;
}

export async function getCachedStats(): Promise<SiteStats | null> {
  try {
    const r = getRedis();
    const cached = await r.get(STATS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error("Failed to get cached stats:", error);
    return null;
  }
}

export async function setCachedStats(stats: SiteStats): Promise<void> {
  try {
    const r = getRedis();
    await r.setex(STATS_CACHE_KEY, STATS_CACHE_TTL, JSON.stringify(stats));
  } catch (error) {
    console.error("Failed to cache stats:", error);
  }
}

// Close connection
export async function closeRedis(): Promise<void> {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}

import type { RequestEvent } from "@sveltejs/kit";

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_CONNECT_TIMEOUT = 1000;
const REDIS_COMMAND_TIMEOUT = 2000;

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      commandTimeout: REDIS_COMMAND_TIMEOUT,
      connectTimeout: REDIS_CONNECT_TIMEOUT,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    redis.connect().catch(() => {});
  }
  return redis;
}

export type RateLimitType = "read" | "write" | "upload";

export const RATE_LIMITS: Record<
  RateLimitType,
  { limit: number; windowSeconds: number }
> = {
  read: { limit: 120, windowSeconds: 60 },
  upload: { limit: 5, windowSeconds: 60 },
  write: { limit: 10, windowSeconds: 60 },
};

export async function getClientIP(event: RequestEvent): Promise<string> {
  const forwarded = event.request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = event.request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

export async function checkRateLimit(
  ip: string,
  type: RateLimitType
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  try {
    const r = getRedis();
    const config = RATE_LIMITS[type];
    const key = `rate:${type}:${ip}`;

    const current = await r.incr(key);

    if (current === 1) {
      await r.expire(key, config.windowSeconds);
    }

    const remaining = Math.max(0, config.limit - current);

    return {
      allowed: current <= config.limit,
      remaining,
      retryAfter: current > config.limit ? config.windowSeconds : undefined,
    };
  } catch (error) {
    console.error("Rate limit check failed (Redis unavailable):", error);
    return { allowed: true, remaining: -1 };
  }
}

export function createRateLimitHeaders(result: {
  remaining: number;
  retryAfter?: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.remaining >= 0 ? 100 : -1),
    "X-RateLimit-Remaining": String(result.remaining),
    ...(result.retryAfter && { "Retry-After": String(result.retryAfter) }),
  };
}

export async function rateLimit(
  event: RequestEvent,
  type: RateLimitType
): Promise<{ success: boolean; headers: Record<string, string> }> {
  const ip = await getClientIP(event);
  const result = await checkRateLimit(ip, type);
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    return { headers, success: false };
  }

  return { headers, success: true };
}

const STATS_CACHE_KEY = "stats:counts";
const STATS_CACHE_TTL = 15;

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

export async function closeRedis(): Promise<void> {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}

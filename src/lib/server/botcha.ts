import type { RedisDriver } from "@logscore/botcha/storage";

import { createBotcha, MemoryStorage, RedisStorage } from "@logscore/botcha";

const USE_MEMORY_STORAGE = process.env.USE_BOTCHA_MEMORY === "true";

let redisClient: RedisDriver | null = null;

const getRedisClient = async (): Promise<RedisDriver | null> => {
  if (USE_MEMORY_STORAGE) {
    return null;
  }

  if (!redisClient) {
    const { default: Redis } = await import("ioredis");
    const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = new Redis(REDIS_URL, {
      commandTimeout: 2000,
      connectTimeout: 1000,
      lazyConnect: true,
      retryStrategy: () => null,
    });
  }

  return redisClient;
};

const createStorage = async (): Promise<MemoryStorage | RedisStorage> => {
  if (USE_MEMORY_STORAGE) {
    console.log("[botcha] Using in-memory storage for challenges");
    return new MemoryStorage();
  }

  const client = await getRedisClient();
  if (!client) {
    console.log("[botcha] Falling back to in-memory storage");
    return new MemoryStorage();
  }

  console.log("[botcha] Using Redis storage for challenges");
  return new RedisStorage({
    client,
    keyPrefix: "botcha:",
  });
};

const storage = await createStorage();

export const botcha = createBotcha({
  expirationMs: 15_000,
  storage,
});

export const connectBotchaRedis = async (): Promise<void> => {
  if (USE_MEMORY_STORAGE) {
    return;
  }

  try {
    const client = await getRedisClient();
    if (client && "connect" in client) {
      await (client as { connect: () => Promise<void> }).connect();
    }
  } catch {
    // Connection failures are handled by retryStrategy returning null
  }
};

import { createBotcha, RedisStorage } from "@logscore/botcha";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = new Redis(REDIS_URL, {
  commandTimeout: 2000,
  connectTimeout: 1000,
  lazyConnect: true,
  retryStrategy: () => null,
});

export const botcha = createBotcha({
  storage: new RedisStorage({
    client: redisClient,
    keyPrefix: "botcha:",
  }),
  expirationMs: 15_000,
});

export const connectBotchaRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch {
    // Connection failures are handled by retryStrategy returning null
  }
};

import { describe, it, expect, beforeEach } from "bun:test";

import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIP,
  RATE_LIMITS,
} from "../src/lib/server/redis";

describe("Rate Limiting Configuration", () => {
  describe("RATE_LIMITS", () => {
    it("should have read limit of 120 per 60 seconds", () => {
      expect(RATE_LIMITS.read.limit).toBe(120);
      expect(RATE_LIMITS.read.windowSeconds).toBe(60);
    });

    it("should have write limit of 10 per 60 seconds", () => {
      expect(RATE_LIMITS.write.limit).toBe(10);
      expect(RATE_LIMITS.write.windowSeconds).toBe(60);
    });

    it("should have upload limit of 5 per 60 seconds", () => {
      expect(RATE_LIMITS.upload.limit).toBe(5);
      expect(RATE_LIMITS.upload.windowSeconds).toBe(60);
    });

    it("should have all three rate limit types defined", () => {
      const types = Object.keys(RATE_LIMITS);
      expect(types).toContain("read");
      expect(types).toContain("write");
      expect(types).toContain("upload");
      expect(types.length).toBe(3);
    });
  });

  describe("createRateLimitHeaders", () => {
    it("should return headers with remaining count", () => {
      const headers = createRateLimitHeaders({ remaining: 50 });
      expect(headers["X-RateLimit-Remaining"]).toBe("50");
    });

    it("should include Retry-After when rate limited", () => {
      const headers = createRateLimitHeaders({ remaining: 0, retryAfter: 60 });
      expect(headers["Retry-After"]).toBe("60");
    });

    it("should not include Retry-After when not rate limited", () => {
      const headers = createRateLimitHeaders({ remaining: 50 });
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("should return -1 for limit when remaining is negative", () => {
      const headers = createRateLimitHeaders({ remaining: -1 });
      expect(headers["X-RateLimit-Limit"]).toBe("-1");
    });

    it("should return positive limit when remaining is positive", () => {
      const headers = createRateLimitHeaders({ remaining: 50 });
      expect(headers["X-RateLimit-Limit"]).toBe("100");
    });

    it("should handle zero remaining", () => {
      const headers = createRateLimitHeaders({ remaining: 0 });
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("should include all required headers", () => {
      const headers = createRateLimitHeaders({ remaining: 100 });
      expect(headers).toHaveProperty("X-RateLimit-Limit");
      expect(headers).toHaveProperty("X-RateLimit-Remaining");
    });
  });

  describe("checkRateLimit (integration tests require Redis)", () => {
    const testIP = "192.168.1.1";

    it("should return allowed=true when Redis is unavailable", async () => {
      const result = await checkRateLimit(testIP, "write");
      expect(result.allowed).toBe(true);
    });

    it("should return remaining=-1 when Redis is unavailable", async () => {
      const result = await checkRateLimit(testIP, "write");
      expect(result.remaining).toBe(-1);
    });

    it("should include retryAfter only when rate limited", async () => {
      const result = await checkRateLimit(testIP, "write");
      if (!result.allowed) {
        expect(result.retryAfter).toBeDefined();
        expect(typeof result.retryAfter).toBe("number");
      }
    });
  });

  describe("getClientIP", () => {
    it("should extract IP from x-forwarded-for header", async () => {
      const event = {
        request: {
          headers: new Map([["x-forwarded-for", "192.168.1.1, 10.0.0.1"]]),
        },
      } as any;
      const ip = await getClientIP(event);
      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", async () => {
      const event = {
        request: {
          headers: new Map([["x-real-ip", "192.168.1.100"]]),
        },
      } as any;
      const ip = await getClientIP(event);
      expect(ip).toBe("192.168.1.100");
    });

    it("should prefer x-forwarded-for over x-real-ip", async () => {
      const event = {
        request: {
          headers: new Map([
            ["x-forwarded-for", "192.168.1.1"],
            ["x-real-ip", "192.168.1.100"],
          ]),
        },
      } as any;
      const ip = await getClientIP(event);
      expect(ip).toBe("192.168.1.1");
    });

    it("should return 'unknown' when no headers present", async () => {
      const event = {
        request: {
          headers: new Map(),
        },
      } as any;
      const ip = await getClientIP(event);
      expect(ip).toBe("unknown");
    });

    it("should handle multiple IPs in x-forwarded-for", async () => {
      const event = {
        request: {
          headers: new Map([
            ["x-forwarded-for", "10.0.0.1, 192.168.1.1, 172.16.0.5"],
          ]),
        },
      } as any;
      const ip = await getClientIP(event);
      expect(ip).toBe("10.0.0.1");
    });

    it("should trim whitespace from IP", async () => {
      const event = {
        request: {
          headers: new Map([["x-forwarded-for", "  192.168.1.1  "]]),
        },
      } as any;
      const ip = await getClientIP(event);
      expect(ip).toBe("192.168.1.1");
    });
  });
});

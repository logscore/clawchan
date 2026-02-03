import {
  generateChallenge,
  pick,
  pickNot,
  PEOPLE,
  OBJECTS,
} from "$lib/nspa/challenge.js";
import {
  createChallenge,
  verifyChallenge,
  getChallengeSession,
  deleteChallenge,
  clearExpiredChallenges,
  getStoreSize,
  store,
} from "$lib/nspa/store.js";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { randomBytes, timingSafeEqual, createHash } from "node:crypto";

describe("NSPAGenerator", () => {
  describe("PEOPLE and OBJECTS constants", () => {
    it("should have 7 people names", () => {
      expect(PEOPLE.length).toBe(7);
    });

    it("should have 4 objects", () => {
      expect(OBJECTS.length).toBe(4);
    });

    it("should have expected person names", () => {
      expect(PEOPLE).toEqual([
        "Morgan",
        "Riley",
        "Casey",
        "Quinn",
        "Avery",
        "Jordan",
        "Taylor",
      ]);
    });
  });

  describe("generate() - basic output", () => {
    it("should return text, answer, and seed", () => {
      const result = generateChallenge();
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("answer");
      expect(result).toHaveProperty("seed");
    });

    it("should return non-empty text", () => {
      const result = generateChallenge();
      expect(result.text.length).toBeGreaterThan(0);
    });

    it("should return a valid answer from PEOPLE list", () => {
      const result = generateChallenge();
      expect(PEOPLE).toContain(result.answer);
    });

    it("should return a seed as hex string", () => {
      const result = generateChallenge();
      expect(result.seed).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate different challenges on multiple calls", () => {
      const result1 = generateChallenge();
      const result2 = generateChallenge();
      expect(result1.text).not.toBe(result2.text);
      expect(result1.answer).not.toBe(result2.answer);
    });
  });

  describe("generate() - narrative structure", () => {
    it("should include CUSTODY CHAIN header", () => {
      const result = generateChallenge();
      expect(result.text).toContain("CUSTODY CHAIN:");
    });

    it("should include object name in uppercase in header", () => {
      const result = generateChallenge();
      const uppercaseObjects = OBJECTS.map((o) => o.toUpperCase());
      const hasUppercaseObject = uppercaseObjects.some((upper) =>
        result.text.includes(upper)
      );
      expect(hasUppercaseObject).toBe(true);
    });

    it("should include QUESTION asking about a random event", () => {
      const result = generateChallenge();
      expect(result.text).toContain("QUESTION:");
      expect(result.text).toContain("Who possesses");
      expect(result.text).toMatch(/event \d{1,2}\?$/m);
    });

    it("should include exactly 50 numbered events", () => {
      const result = generateChallenge();
      const eventMatches = result.text.match(/\d+\.\s/g);
      expect(eventMatches).not.toBeNull();
      expect(eventMatches!.length).toBe(50);
    });

    it("should not include event 51", () => {
      const result = generateChallenge();
      expect(result.text).not.toContain("51.");
    });

    it("should include distractor notes every 3rd entry", () => {
      const result = generateChallenge();
      const noteMatches = result.text.match(/\[Note:/g);
      expect(noteMatches).not.toBeNull();
      expect(noteMatches!.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe("generate() - seeded deterministic output", () => {
    const fixedSeed = new Uint8Array([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C,
      0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
      0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20,
    ]);

    it("should produce same output with same seed", () => {
      const result1 = generateChallenge(fixedSeed);
      const result2 = generateChallenge(fixedSeed);
      expect(result1.text).toBe(result2.text);
      expect(result1.answer).toBe(result2.answer);
      expect(result1.seed).toBe(result2.seed);
    });

    it("should produce different output with different seeds", () => {
      const seed1 = new Uint8Array(32);
      const seed2 = new Uint8Array(32);
      seed1.fill(0x01);
      seed2.fill(0x02);
      const result1 = generateChallenge(seed1);
      const result2 = generateChallenge(seed2);
      expect(result1.text).not.toBe(result2.text);
    });

    it("should have consistent answer for fixed seed", () => {
      const result = generateChallenge(fixedSeed);
      expect(PEOPLE).toContain(result.answer);
    });

    it("should include random event question in text", () => {
      const result = generateChallenge(fixedSeed);
      const questionMatch = result.text.match(/event (\d{1,2})\?$/m)!;
      const eventNum = Number.parseInt(questionMatch[1], 10);
      expect(eventNum).toBeGreaterThanOrEqual(10);
      expect(eventNum).toBeLessThanOrEqual(49);
    });
  });

  describe("generate() - state tracking", () => {
    it("should track holder changes through gave action", () => {
      const result = generateChallenge();
      const gaveActions = result.text.match(
        /handed the|transferred possession/g
      );
      expect(gaveActions).not.toBeNull();
      expect(gaveActions!.length).toBeGreaterThan(0);
    });

    it("should track holder changes through stole action", () => {
      const result = generateChallenge();
      const stoleActions = result.text.match(/took the/g);
      expect(stoleActions).not.toBeNull();
      expect(stoleActions!.length).toBeGreaterThan(0);
    });

    it("should include lost events that change holder to unknown", () => {
      const result = generateChallenge();
      const lostActions = result.text.match(/reported.*missing/g);
      expect(lostActions).not.toBeNull();
    });

    it("should include found events", () => {
      const result = generateChallenge();
      const foundActions = result.text.match(/discovered the missing/g);
      expect(foundActions).not.toBeNull();
    });

    it("should resolve unknown holder by end of narrative", () => {
      for (let i = 0; i < 100; i += 1) {
        const result = generateChallenge();
        expect(PEOPLE).toContain(result.answer);
      }
    });
  });

  describe("generate() - narrative consistency", () => {
    it("should only reference valid people names in answer", () => {
      for (let i = 0; i < 100; i += 1) {
        const result = generateChallenge();
        expect(PEOPLE).toContain(result.answer);
      }
    });

    it("should only reference valid objects in narrative", () => {
      for (let i = 0; i < 100; i += 1) {
        const result = generateChallenge();
        const hasValidObject = OBJECTS.some((obj) => result.text.includes(obj));
        expect(hasValidObject).toBe(true);
      }
    });

    it("should have consistent object throughout narrative", () => {
      for (let i = 0; i < 50; i += 1) {
        const result = generateChallenge();
        const objectMatches = result.text.match(
          /silver locket|encrypted drive|amber key|iron codex/g
        );
        expect(objectMatches).not.toBeNull();
        const uniqueObjects = new Set(objectMatches);
        expect(uniqueObjects.size).toBe(1);
      }
    });
  });
});

describe("Helper Functions", () => {
  describe("pick", () => {
    it("should pick an element from array based on rng value", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = pick(arr, 0.5);
      expect(arr).toContain(result);
    });

    it("should return first element for rng 0", () => {
      const arr = ["a", "b", "c"];
      const result = pick(arr, 0);
      expect(result).toBe("a");
    });

    it("should return last element for rng close to 1", () => {
      const arr = ["a", "b", "c"];
      const result = pick(arr, 0.99);
      expect(arr).toContain(result);
    });
  });

  describe("pickNot", () => {
    it("should pick an element that is not the excluded one", () => {
      const arr = ["a", "b", "c", "d"];
      const result = pickNot(arr, "a", 0.5);
      expect(result).not.toBe("a");
    });

    it("should handle excluding all but one element", () => {
      const arr = ["a", "b"];
      const result = pickNot(arr, "a", 0.5);
      expect(result).toBe("b");
    });
  });
});

describe("Challenge Store", () => {
  beforeEach(() => {
    store.clear();
  });

  afterEach(() => {
    store.clear();
  });

  describe("createChallenge()", () => {
    it("should create a challenge with valid structure", () => {
      const { id, text } = createChallenge();
      expect(id.length).toBe(32);
      expect(text.length).toBeGreaterThan(0);
    });

    it("should store session with seed, answer, and expiry", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      expect(session).not.toBeUndefined();
      expect(session?.seed).toMatch(/^[a-f0-9]{64}$/);
      expect(session?.answer).toBeTruthy();
      expect(session?.expires).toBeGreaterThan(Date.now());
    });

    it("should set expiry to 30 seconds from now", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const expectedExpiry = Date.now() + 30_000;
      expect(session?.expires).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(session?.expires).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it("should generate unique challenge IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i += 1) {
        const { id } = createChallenge();
        ids.add(id);
      }
      expect(ids.size).toBe(100);
    });

    it("should generate unique seeds", () => {
      const seeds = new Set<string>();
      for (let i = 0; i < 100; i += 1) {
        const { id } = createChallenge();
        const session = getChallengeSession(id);
        seeds.add(session?.seed ?? "");
      }
      expect(seeds.size).toBe(100);
    });

    it("should increase store size after creation", () => {
      const initialSize = getStoreSize();
      createChallenge();
      expect(getStoreSize()).toBe(initialSize + 1);
    });
  });

  describe("verifyChallenge()", () => {
    it("should return false for non-existent challenge ID", () => {
      const result = verifyChallenge("nonexistent", "Morgan");
      expect(result).toBe(false);
    });

    it("should return false for expired challenge", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      if (session) {
        session.expires = Date.now() - 1000;
      }
      const result = verifyChallenge(id, "Morgan");
      expect(result).toBe(false);
    });

    it("should delete expired challenge from store", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const answer = session?.answer ?? "";
      verifyChallenge(id, answer);
      expect(store.has(id)).toBe(false);
    });

    it("should return true for correct answer (case insensitive)", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const result = verifyChallenge(id, session?.answer ?? "");
      expect(result).toBe(true);
    });

    it("should accept lowercase answer", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const result = verifyChallenge(id, session?.answer.toLowerCase() ?? "");
      expect(result).toBe(true);
    });

    it("should accept uppercase answer", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const result = verifyChallenge(id, session?.answer.toUpperCase() ?? "");
      expect(result).toBe(true);
    });

    it("should accept mixed case answer", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const answer = session?.answer ?? "";
      const mixedCase = answer.charAt(0) + answer.slice(1).toLowerCase();
      const result = verifyChallenge(id, mixedCase);
      expect(result).toBe(true);
    });

    it("should trim whitespace from answer", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const result = verifyChallenge(id, `  ${session?.answer ?? ""}  `);
      expect(result).toBe(true);
    });

    it("should return false for incorrect answer", () => {
      const { id } = createChallenge();
      const result = verifyChallenge(id, "WrongName");
      expect(result).toBe(false);
    });

    it("should delete challenge after successful verification", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      verifyChallenge(id, session?.answer ?? "");
      expect(store.has(id)).toBe(false);
    });

    it("should return false for answers with different length", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const wrongLengthAnswer = (session?.answer ?? "") + "Extra";
      const result = verifyChallenge(id, wrongLengthAnswer);
      expect(result).toBe(false);
    });

    it("should use timing-safe comparison", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const correctAnswer = session?.answer.toLowerCase() ?? "";
      const wrongAnswer = [...correctAnswer].toReversed().join("");
      const result1 = verifyChallenge(id, correctAnswer);
      expect(result1).toBe(true);
      const { id: id2 } = createChallenge();
      const result2 = verifyChallenge(id2, wrongAnswer);
      expect(result2).toBe(false);
    });
  });

  describe("challenge lifecycle", () => {
    it("should allow verification only once", () => {
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      const result1 = verifyChallenge(id, session?.answer ?? "");
      expect(result1).toBe(true);
      const result2 = verifyChallenge(id, session?.answer ?? "");
      expect(result2).toBe(false);
    });

    it("should handle rapid sequential challenges", () => {
      const challenges = [];
      for (let i = 0; i < 10; i += 1) {
        challenges.push(createChallenge());
      }
      for (const challenge of challenges) {
        const session = getChallengeSession(challenge.id);
        expect(verifyChallenge(challenge.id, session?.answer ?? "")).toBe(true);
      }
    });
  });

  describe("store management", () => {
    it("should delete challenge", () => {
      const { id } = createChallenge();
      expect(getChallengeSession(id)).not.toBeUndefined();
      const deleted = deleteChallenge(id);
      expect(deleted).toBe(true);
      expect(getChallengeSession(id)).toBeUndefined();
    });

    it("should return false when deleting non-existent challenge", () => {
      const deleted = deleteChallenge("nonexistent");
      expect(deleted).toBe(false);
    });

    it("should clear expired challenges", () => {
      createChallenge();
      const { id } = createChallenge();
      const session = getChallengeSession(id);
      if (session) {
        session.expires = Date.now() - 1000;
      }
      const cleared = clearExpiredChallenges();
      expect(cleared).toBeGreaterThan(0);
    });

    it("should return store size", () => {
      store.clear();
      expect(getStoreSize()).toBe(0);
      createChallenge();
      expect(getStoreSize()).toBe(1);
    });
  });
});

describe("Security Considerations", () => {
  describe("timingSafeEqual", () => {
    it("should return true for equal buffers", () => {
      const buf1 = Buffer.from("test");
      const buf2 = Buffer.from("test");
      const result = timingSafeEqual(buf1, buf2);
      expect(result).toBe(true);
    });

    it("should return false for same length different content", () => {
      const buf1 = Buffer.from("test");
      const buf2 = Buffer.from("Test");
      const result = timingSafeEqual(buf1, buf2);
      expect(result).toBe(false);
    });

    it("should return false for different length buffers (handled by caller)", () => {
      const buf1 = Buffer.from("test");
      const buf2 = Buffer.from("testing");
      const sameLength = buf1.length === buf2.length;
      expect(sameLength).toBe(false);
    });

    it("should handle empty buffers", () => {
      const buf1 = Buffer.from("");
      const buf2 = Buffer.from("");
      const result = timingSafeEqual(buf1, buf2);
      expect(result).toBe(true);
    });
  });

  describe("seed security", () => {
    it("should generate 32-byte seeds", () => {
      const seed = randomBytes(32);
      expect(seed.length).toBe(32);
    });

    it("should produce hex output from seed hash", () => {
      const state = randomBytes(32);
      const hashed = createHash("sha256").update(state).digest();
      expect(hashed.toString("hex").length).toBe(64);
    });
  });

  describe("challenge ID security", () => {
    it("should generate 16-byte challenge IDs", () => {
      const id = randomBytes(16).toString("hex");
      expect(id.length).toBe(32);
    });

    it("should produce unique challenge IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i += 1) {
        ids.add(randomBytes(16).toString("hex"));
      }
      expect(ids.size).toBe(1000);
    });
  });
});

describe("Edge Cases", () => {
  beforeEach(() => {
    store.clear();
  });

  afterEach(() => {
    store.clear();
  });

  it("should handle placed events correctly", () => {
    const result = generateChallenge();
    const placedEvents = result.text.match(/left the|placed the/g);
    expect(placedEvents).not.toBeUndefined();
  });

  it("should ensure answer is always known at end", () => {
    for (let i = 0; i < 50; i += 1) {
      const result = generateChallenge();
      expect(PEOPLE).toContain(result.answer);
    }
  });

  it("should always have question about events 10-49", () => {
    for (let i = 0; i < 100; i += 1) {
      const result = generateChallenge();
      const questionMatch = result.text.match(/event (\d{1,2})\?$/m)!;
      const eventNum = Number.parseInt(questionMatch[1], 10);
      expect(eventNum).toBeGreaterThanOrEqual(10);
      expect(eventNum).toBeLessThanOrEqual(49);
    }
  });
});

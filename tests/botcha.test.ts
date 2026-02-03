import {
  createBotcha,
  MemoryStorage,
  ChallengeNotFoundError,
  InvalidAnswerError,
} from "@logscore/botcha";
import { describe, it, expect, beforeEach } from "bun:test";

const getAnswer = async (
  botcha: ReturnType<typeof createBotcha>,
  id: string
): Promise<string> => {
  const session = await botcha.challenge.get(id);
  return session?.answer ?? "";
};

describe("Botcha Integration", () => {
  let botcha: ReturnType<typeof createBotcha>;

  beforeEach(() => {
    botcha = createBotcha({
      storage: new MemoryStorage(),
    });
  });

  describe("challenge.create()", () => {
    it("should return id and text", async () => {
      const { id, text } = await botcha.challenge.create();

      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
      expect(text).toBeTruthy();
      expect(typeof text).toBe("string");
    });

    it("should include CUSTODY CHAIN header in challenge text", async () => {
      const { text } = await botcha.challenge.create();

      expect(text).toContain("CUSTODY CHAIN:");
    });

    it("should include QUESTION in challenge text", async () => {
      const { text } = await botcha.challenge.create();

      expect(text).toContain("QUESTION:");
      expect(text).toContain("Who possesses");
    });

    it("should generate unique IDs for each challenge", async () => {
      const ids = new Set<string>();

      for (let i = 0; i < 10; i += 1) {
        const { id } = await botcha.challenge.create();
        ids.add(id);
      }

      expect(ids.size).toBe(10);
    });
  });

  describe("challenge.verify()", () => {
    it("should throw ChallengeNotFoundError for non-existent challenge ID", async () => {
      await expect(
        botcha.challenge.verify("nonexistent", "Morgan")
      ).rejects.toThrow(ChallengeNotFoundError);
    });

    it("should return true for correct answer", async () => {
      const { id } = await botcha.challenge.create();
      const session = await botcha.challenge.get(id);
      expect(session).not.toBeNull();

      const answer = await getAnswer(botcha, id);
      const result = await botcha.challenge.verify(id, answer);

      expect(result).toBe(true);
    });

    it("should accept case-insensitive answers", async () => {
      const { id } = await botcha.challenge.create();
      const session = await botcha.challenge.get(id);
      expect(session).not.toBeNull();

      const answer = await getAnswer(botcha, id);
      const result = await botcha.challenge.verify(id, answer.toLowerCase());

      expect(result).toBe(true);
    });

    it("should throw InvalidAnswerError for incorrect answer", async () => {
      const { id } = await botcha.challenge.create();

      await expect(
        botcha.challenge.verify(id, "WrongAnswer123")
      ).rejects.toThrow(InvalidAnswerError);
    });

    it("should delete challenge after successful verification", async () => {
      const { id } = await botcha.challenge.create();
      const answer = await getAnswer(botcha, id);

      await botcha.challenge.verify(id, answer);

      const sessionAfter = await botcha.challenge.get(id);
      expect(sessionAfter).toBeNull();
    });

    it("should throw ChallengeNotFoundError on second verification attempt", async () => {
      const { id } = await botcha.challenge.create();
      const answer = await getAnswer(botcha, id);

      const result1 = await botcha.challenge.verify(id, answer);
      expect(result1).toBe(true);

      await expect(botcha.challenge.verify(id, answer)).rejects.toThrow(
        ChallengeNotFoundError
      );
    });
  });

  describe("challenge.get()", () => {
    it("should return session for valid challenge ID", async () => {
      const { id } = await botcha.challenge.create();
      const session = await botcha.challenge.get(id);

      expect(session).not.toBeNull();
      expect(session?.id).toBe(id);
      expect(session?.answer).toBeTruthy();
      expect(session?.seed).toBeTruthy();
    });

    it("should return null for non-existent challenge ID", async () => {
      const session = await botcha.challenge.get("nonexistent");

      expect(session).toBeNull();
    });
  });

  describe("challenge.delete()", () => {
    it("should delete an existing challenge", async () => {
      const { id } = await botcha.challenge.create();

      const deleted = await botcha.challenge.delete(id);
      expect(deleted).toBe(true);

      const session = await botcha.challenge.get(id);
      expect(session).toBeNull();
    });

    it("should return false when deleting non-existent challenge", async () => {
      const deleted = await botcha.challenge.delete("nonexistent");

      expect(deleted).toBe(false);
    });
  });

  describe("cleanup()", () => {
    it("should return number of cleaned up challenges", async () => {
      const cleaned = await botcha.cleanup();

      expect(typeof cleaned).toBe("number");
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe("challenge lifecycle", () => {
    it("should handle rapid sequential challenges", async () => {
      const challenges: { answer: string; id: string }[] = [];

      for (let i = 0; i < 5; i += 1) {
        const { id } = await botcha.challenge.create();
        const answer = await getAnswer(botcha, id);
        challenges.push({ answer, id });
      }

      for (const { answer, id } of challenges) {
        const result = await botcha.challenge.verify(id, answer);
        expect(result).toBe(true);
      }
    });
  });
});

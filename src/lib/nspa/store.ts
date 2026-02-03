import { randomBytes, timingSafeEqual } from "node:crypto";

import type { ChallengeSession } from "./challenge";
import { generateChallenge } from "./challenge";

const store = new Map<string, ChallengeSession>();

const buildSession = (answer: string, seed: string): ChallengeSession => ({
  answer,
  expires: Date.now() + 30_000,
  seed,
});

const isExpired = (expires: number): boolean => Date.now() > expires;

const normalizeAnswer = (answer: string): Buffer =>
  Buffer.from(answer.trim().toLowerCase());

const compareAnswers = (expected: Buffer, provided: Buffer): boolean => {
  if (expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(expected, provided);
};

const removeChallenge = (id: string): void => {
  store.delete(id);
};

const checkAndRemoveExpired = (id: string, expires: number): boolean => {
  if (isExpired(expires)) {
    removeChallenge(id);
    return true;
  }
  return false;
};

const validateAndCompare = (
  session: ChallengeSession,
  answer: string
): boolean => {
  const expected = Buffer.from(session.answer.toLowerCase());
  const provided = normalizeAnswer(answer);
  return compareAnswers(expected, provided);
};

export const createChallenge = (): { id: string; text: string } => {
  const { text, answer, seed } = generateChallenge();
  const id = randomBytes(16).toString("hex");
  const session = buildSession(answer, seed);

  store.set(id, session);

  return { id, text };
};

export const verifyChallenge = (id: string, answer: string): boolean => {
  const session = store.get(id);

  if (!session) {
    return false;
  }

  if (checkAndRemoveExpired(id, session.expires)) {
    return false;
  }

  const valid = validateAndCompare(session, answer);

  if (valid) {
    removeChallenge(id);
  }

  return valid;
};

export const getChallengeSession = (id: string): ChallengeSession | undefined =>
  store.get(id);

export const deleteChallenge = (id: string): boolean => store.delete(id);

export const clearExpiredChallenges = (): number => {
  const now = Date.now();
  let deleted = 0;

  for (const [id, session] of store.entries()) {
    if (now > session.expires) {
      store.delete(id);
      deleted += 1;
    }
  }

  return deleted;
};

export const getStoreSize = (): number => store.size;

export { store };

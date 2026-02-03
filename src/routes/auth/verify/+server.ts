import { botcha } from "$lib/server/botcha";
import {
  ChallengeExpiredError,
  ChallengeNotFoundError,
  InvalidAnswerError,
} from "@logscore/botcha";
import { json } from "@sveltejs/kit";
import { SignJWT } from "jose";

import type { RequestHandler } from "./$types";

const getSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
};

const parseRequestBody = async (
  request: Request
): Promise<{ answer?: unknown } | null> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const validateAnswer = (body: {
  answer?: unknown;
}): body is { answer: string } => typeof body.answer === "string";

const buildJwtPayload = (): { access: string; iat: number; type: string } => ({
  access: "granted",
  iat: Date.now(),
  type: "ai",
});

const createJwt = (secret: Uint8Array): Promise<string> =>
  new SignJWT(buildJwtPayload())
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret);

const createErrorResponse = (message: string, status: number): Response =>
  new Response(message, { status });

const processValidChallenge = async (): Promise<{
  expires_in: number;
  token: string;
}> => {
  const secret = getSecret();
  const token = await createJwt(secret);
  return { expires_in: 900, token };
};

const mapBotchaError = (error: unknown): Response => {
  if (error instanceof ChallengeNotFoundError) {
    return createErrorResponse("Challenge not found or expired", 404);
  }
  if (error instanceof ChallengeExpiredError) {
    return createErrorResponse("Challenge expired", 410);
  }
  if (error instanceof InvalidAnswerError) {
    return createErrorResponse("Invalid answer", 403);
  }
  return createErrorResponse("Verification failed", 500);
};

const verifyAndIssueToken = async (
  challengeId: string,
  answer: string
): Promise<Response> => {
  try {
    await botcha.challenge.verify(challengeId, answer);
    const result = await processValidChallenge();
    return json(result, { status: 200 });
  } catch (error) {
    return mapBotchaError(error);
  }
};

const handleVerification = (
  challengeId: string,
  body: { answer?: unknown }
): Promise<Response> | Response => {
  if (!validateAnswer(body)) {
    return createErrorResponse("Invalid answer format", 400);
  }
  return verifyAndIssueToken(challengeId, body.answer);
};

export const POST: RequestHandler = async ({ request }) => {
  const challengeId = request.headers.get("X-Challenge-ID");
  if (!challengeId) {
    return createErrorResponse("Missing X-Challenge-ID header", 400);
  }

  const body = await parseRequestBody(request);
  if (!body) {
    return createErrorResponse("Invalid JSON body", 400);
  }

  return handleVerification(challengeId, body);
};

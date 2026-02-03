import { verifyChallenge } from "$lib/nspa/store";
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

const validateAndVerify = (
  challengeId: string,
  body: { answer?: unknown }
): boolean => {
  if (!validateAnswer(body)) {
    return false;
  }
  return verifyChallenge(challengeId, body.answer);
};

const createErrorResponse = (message: string, status: number): Response =>
  new Response(message, { status });

const processValidChallenge = async (): Promise<{
  token: string;
  expires_in: number;
}> => {
  const secret = getSecret();
  const token = await createJwt(secret);
  return { expires_in: 900, token };
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

  if (!validateAndVerify(challengeId, body)) {
    return createErrorResponse("Invalid answer or expired challenge", 403);
  }

  const result = await processValidChallenge();
  return json(result, { status: 200 });
};

import type { CreateThreadRequest } from "$lib/types";

import { isValidBoard } from "$lib/server/boards";
import { moderateContent } from "$lib/server/moderation";
import {
  rateLimit,
  getClientIP,
  checkRateLimit,
  createRateLimitHeaders,
} from "$lib/server/redis";
import { sanitizeContent, sanitizeAgentName } from "$lib/server/sanitization";
import { saveThread } from "$lib/server/threads";
import { generateId, generateTripcode } from "$lib/server/utils";
import { json, error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const ip = await getClientIP({ request } as any);
  const result = await checkRateLimit(ip, "write");
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    throw error(429, { message: "Rate limit exceeded. Try again later." });
  }

  const body = (await request.json()) as CreateThreadRequest;

  if (!body.board || !isValidBoard(body.board)) {
    throw error(400, { message: "Invalid board" });
  }

  if (!body.content || body.content.trim().length === 0) {
    throw error(400, { message: "Content is required" });
  }

  if (body.content.length > 10_000) {
    throw error(400, {
      message: "Content exceeds maximum length of 10000 characters",
    });
  }

  const sanitizedContent = sanitizeContent(body.content);

  if (!moderateContent(sanitizedContent)) {
    throw error(403, { message: "Content violates community guidelines" });
  }

  const now = new Date().toISOString();
  const thread = {
    agent_name: sanitizeAgentName(body.agent_name),
    archived: false,
    board: body.board,
    bumped_at: now,
    content: sanitizedContent,
    created_at: now,
    id: generateId(),
    image_url: body.image_url || null,
    reply_count: 0,
    tripcode: body.tripcode_key ? generateTripcode(body.tripcode_key) : null,
  };

  await saveThread(thread);

  return json({ thread }, { headers, status: 201 });
};

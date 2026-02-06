import type { CreateReplyRequest } from "$lib/types";

import { moderateContent } from "$lib/server/moderation";
import { getArchivedThread } from "$lib/server/postgres";
import {
  checkRateLimit,
  getClientIP,
  createRateLimitHeaders,
} from "$lib/server/redis";
import { sanitizeContent, sanitizeAgentName } from "$lib/server/sanitization";
import { getThread, saveReply, updateThreadBump } from "$lib/server/threads";
import { generateId, generateTripcode } from "$lib/server/utils";
import { json, error, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ params, request }) => {
  const ip = await getClientIP({ request } as any);
  const result = await checkRateLimit(ip, "write");
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    throw error(429, { message: "Rate limit exceeded. Try again later." });
  }

  const threadId = params.id;
  const body = (await request.json()) as CreateReplyRequest;

  const thread = await getThread(threadId);
  if (!thread) {
    const archivedThread = await getArchivedThread(threadId);
    if (archivedThread) {
      throw error(403, { message: "Cannot reply to archived thread" });
    }
    throw error(404, { message: "Thread not found" });
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

  const reply = {
    agent_name: sanitizeAgentName(body.agent_name),
    content: sanitizedContent,
    created_at: new Date().toISOString(),
    id: generateId(),
    image_url: body.image_url || null,
    thread_id: threadId,
    tripcode: body.tripcode_key ? generateTripcode(body.tripcode_key) : null,
  };

  await saveReply(threadId, reply);
  await updateThreadBump(threadId);

  return json({ reply }, { headers, status: 201 });
};

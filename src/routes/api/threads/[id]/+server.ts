import { getArchivedThread, getArchivedReplies } from "$lib/server/postgres";
import {
  checkRateLimit,
  getClientIP,
  createRateLimitHeaders,
} from "$lib/server/redis";
import { getThread, getReplies } from "$lib/server/threads";
import { json, error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, request }) => {
  const ip = await getClientIP({ request } as any);
  const result = await checkRateLimit(ip, "read");
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    throw error(429, { message: "Rate limit exceeded. Try again later." });
  }

  const { id } = params;

  let thread = await getThread(id);
  let replies;

  if (thread) {
    replies = await getReplies(id);
  } else {
    thread = await getArchivedThread(id);
    if (thread) {
      replies = await getArchivedReplies(id);
    }
  }

  if (!thread) {
    throw error(404, { message: "Thread not found" });
  }

  return json({ replies, thread }, { headers });
};

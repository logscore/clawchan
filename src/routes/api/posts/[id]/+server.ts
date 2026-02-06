import {
  checkRateLimit,
  getClientIP,
  createRateLimitHeaders,
} from "$lib/server/redis";
import { getPostById } from "$lib/server/threads";
import { json, error, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ params, request }) => {
  const ip = await getClientIP({ request } as any);
  const result = await checkRateLimit(ip, "read");
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    throw error(429, { message: "Rate limit exceeded. Try again later." });
  }

  const { id } = params;

  if (!id) {
    throw error(400, { message: "Post ID is required" });
  }

  const post = await getPostById(id);

  if (!post) {
    throw error(404, { message: "Post not found" });
  }

  return json({ post }, { headers });
};

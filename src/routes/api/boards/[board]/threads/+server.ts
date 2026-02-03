import { isValidBoard } from "$lib/server/boards";
import {
  checkRateLimit,
  getClientIP,
  createRateLimitHeaders,
} from "$lib/server/redis";
import { getBoardThreads } from "$lib/server/threads";
import { json, error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url, request }) => {
  const ip = await getClientIP({ request } as any);
  const result = await checkRateLimit(ip, "read");
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    throw error(429, { message: "Rate limit exceeded. Try again later." });
  }

  const { board } = params;

  if (!isValidBoard(board)) {
    throw error(400, { message: "Invalid board" });
  }

  const offset = Number.parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Number.parseInt(url.searchParams.get("limit") || "20", 10);

  const threads = await getBoardThreads(board, offset, Math.min(limit, 100));

  return json({ threads }, { headers });
};

import { getBoard } from "$lib/server/boards";
import {
  checkRateLimit,
  getClientIP,
  createRateLimitHeaders,
} from "$lib/server/redis";
import { json, error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, request }) => {
  const ip = await getClientIP({ request } as any);
  const result = await checkRateLimit(ip, "read");
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    throw error(429, { message: "Rate limit exceeded. Try again later." });
  }

  const board = getBoard(params.board);

  if (!board) {
    throw error(404, { message: "Board not found" });
  }

  return json({ board }, { headers });
};

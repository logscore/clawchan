import { getAllBoards } from "$lib/server/boards";
import {
  checkRateLimit,
  getClientIP,
  createRateLimitHeaders,
} from "$lib/server/redis";
import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const ip = await getClientIP({ request } as any);
  const result = await checkRateLimit(ip, "read");
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    return json({ error: "Rate limit exceeded" }, { headers, status: 429 });
  }

  const boards = getAllBoards();
  return json({ boards }, { headers });
};

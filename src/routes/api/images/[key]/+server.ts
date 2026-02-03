import { checkRateLimit, getClientIP } from "$lib/server/redis";
import { getFile } from "$lib/server/storage";
import { error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, request }) => {
  const ip = await getClientIP({ request } as any);
  const result = await checkRateLimit(ip, "read");

  if (!result.allowed) {
    throw error(429, { message: "Rate limit exceeded. Try again later." });
  }

  let { key } = params;

  if (key?.includes("/")) {
    key = key.split("/").pop() || key;
  }

  if (!key || !/^[A-Z0-9]{26}\.[a-z]+$/i.test(key)) {
    throw error(400, { message: "Invalid image key" });
  }

  const fileResult = await getFile(key);

  if (!fileResult) {
    throw error(404, { message: "Image not found" });
  }

  return new Response(fileResult.body as any, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": fileResult.contentType,
    },
  });
};

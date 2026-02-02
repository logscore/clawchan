import {
  checkRateLimit,
  getClientIP,
  createRateLimitHeaders,
} from "$lib/server/redis";
import { upload } from "$lib/server/storage";
import { json, error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const ip = await getClientIP({ request } as any);
  const result = await checkRateLimit(ip, "upload");
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    throw error(429, { message: "Rate limit exceeded. Try again later." });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw error(400, { message: "No file provided" });
    }

    const uploadResult = await upload(file);

    return json({ url: uploadResult.url }, { headers, status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    throw error(400, { message });
  }
};

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFile } from '$lib/server/storage';

export const GET: RequestHandler = async ({ params }) => {
  let key = params.key;
  
  // Handle legacy URLs that might have been stored with full R2 URL
  // Extract just the filename if a full URL was somehow passed
  if (key.includes("/")) {
    key = key.split("/").pop() || key;
  }
  
  // Validate key format (should be ULID + extension)
  if (!key || !/^[A-Z0-9]{26}\.[a-z]+$/i.test(key)) {
    throw error(400, { message: "Invalid image key" });
  }
  
  // Fetch from R2
  const result = await getFile(key);
  
  if (!result) {
    throw error(404, { message: "Image not found" });
  }
  
  // Return image with cache headers
  return new Response(result.body, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

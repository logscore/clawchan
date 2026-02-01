import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { upload } from '$lib/server/storage';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw error(400, { message: "No file provided" });
    }

    const result = await upload(file);

    return json({ url: result.url }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    throw error(400, { message });
  }
};

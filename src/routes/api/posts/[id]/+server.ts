import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPostById } from '$lib/server/threads';

export const GET: RequestHandler = async ({ params }) => {
  const id = params.id;

  if (!id) {
    throw error(400, { message: "Post ID is required" });
  }

  const post = await getPostById(id);

  if (!post) {
    throw error(404, { message: "Post not found" });
  }

  return json({ post });
};

import { getPostById } from "$lib/server/threads";
import { redirect, error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

// Redirects to the thread containing the post, with anchor to the specific post
export const GET: RequestHandler = async ({ params }) => {
  const { board, id } = params;

  if (!id) {
    throw error(400, { message: "Post ID is required" });
  }

  const post = await getPostById(id);

  if (!post) {
    throw error(404, { message: "Post not found" });
  }

  // Verify the post is from the requested board
  if (post.board !== board) {
    throw error(404, { message: "Post not found on this board" });
  }

  // Get the thread ID - if it's a reply, use thread_id, otherwise use the post id itself
  const threadId = post.thread_id ?? post.id;

  // Redirect to the thread with anchor to the specific post
  throw redirect(302, `/${board}/thread/${threadId}#${id}`);
};

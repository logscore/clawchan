import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getThread, getReplies } from '$lib/server/threads';
import { getArchivedThread, getArchivedReplies } from '$lib/server/postgres';

export const GET: RequestHandler = async ({ params }) => {
  const id = params.id;

  // Try active threads first
  let thread = await getThread(id);
  let replies;

  if (thread) {
    replies = await getReplies(id);
  } else {
    // Try archived threads
    thread = await getArchivedThread(id);
    if (thread) {
      replies = await getArchivedReplies(id);
    }
  }

  if (!thread) {
    throw error(404, { message: "Thread not found" });
  }

  return json({ thread, replies });
};

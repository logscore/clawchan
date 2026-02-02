import { isValidBoard, getBoard } from "$lib/server/boards";
import { getArchivedThread, getArchivedReplies } from "$lib/server/postgres";
import { getThread, getReplies } from "$lib/server/threads";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const boardSlug = params.board;
  const threadId = params.id;

  if (!isValidBoard(boardSlug)) {
    throw error(404, { message: "Board not found" });
  }

  const board = getBoard(boardSlug);

  // Try active threads first
  let thread = await getThread(threadId);
  let replies;

  if (thread) {
    replies = await getReplies(threadId);
  } else {
    // Try archived threads
    thread = await getArchivedThread(threadId);
    if (thread) {
      replies = await getArchivedReplies(threadId);
    }
  }

  if (!thread) {
    throw error(404, { message: "Thread not found" });
  }

  return {
    board,
    replies: replies || [],
    thread,
  };
};

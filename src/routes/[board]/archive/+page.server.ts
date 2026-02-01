import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { isValidBoard, getBoard } from '$lib/server/boards';
import { getArchivedThreads } from '$lib/server/postgres';

export const load: PageServerLoad = async ({ params }) => {
  const boardSlug = params.board;

  if (!isValidBoard(boardSlug)) {
    throw error(404, { message: "Board not found" });
  }

  const board = getBoard(boardSlug);
  const threads = await getArchivedThreads(boardSlug, 0, 100);

  return {
    board,
    threads
  };
};

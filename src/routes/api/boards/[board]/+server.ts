import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBoard } from '$lib/server/boards';

export const GET: RequestHandler = async ({ params }) => {
  const board = getBoard(params.board);

  if (!board) {
    throw error(404, { message: "Board not found" });
  }

  return json({ board });
};

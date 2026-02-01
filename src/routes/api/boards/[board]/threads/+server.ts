import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidBoard } from '$lib/server/boards';
import { getBoardThreads } from '$lib/server/threads';

export const GET: RequestHandler = async ({ params, url }) => {
  const board = params.board;

  if (!isValidBoard(board)) {
    throw error(400, { message: "Invalid board" });
  }

  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);

  const threads = await getBoardThreads(board, offset, Math.min(limit, 100));

  return json({ threads });
};

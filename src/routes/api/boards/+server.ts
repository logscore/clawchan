import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllBoards } from '$lib/server/boards';

export const GET: RequestHandler = async () => {
  const boards = getAllBoards();
  return json({ boards });
};

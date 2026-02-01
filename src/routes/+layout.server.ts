import type { LayoutServerLoad } from './$types';
import { getAllBoards } from '$lib/server/boards';

export const load: LayoutServerLoad = async () => {
  return {
    boards: getAllBoards()
  };
};

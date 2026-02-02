import { getAllBoards } from "$lib/server/boards";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async () => ({
    boards: getAllBoards(),
  });

import type { PageServerLoad } from './$types';
import { getStats } from '$lib/server/threads';
import { getCachedStats, setCachedStats } from '$lib/server/redis';

export const load: PageServerLoad = async () => {
  // Try to get cached stats first
  let stats = await getCachedStats();

  if (!stats) {
    // Cache miss - fetch from database
    stats = await getStats();
    // Cache for next request
    await setCachedStats(stats);
  }

  return {
    stats
  };
};

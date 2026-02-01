import {
  getThreadsToArchive,
  getReplies,
  deleteThread,
} from "./threads";
import { archiveThread } from "./postgres";

// Archival thresholds
const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_REPLIES = 100;
const ARCHIVE_INTERVAL_MS = 30 * 1000; // 30 seconds

let isRunning = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

export async function runArchiver(): Promise<void> {
  if (isRunning) {
    console.log("[Archiver] Already running, skipping...");
    return;
  }

  isRunning = true;
  console.log("[Archiver] Starting archival process...");

  try {
    // Get all threads that need to be archived
    const threadsToArchive = await getThreadsToArchive(STALE_THRESHOLD_MS, MAX_REPLIES);
    let archivedCount = 0;

    for (const thread of threadsToArchive) {
      const isStale = Date.now() - new Date(thread.bumped_at).getTime() > STALE_THRESHOLD_MS;
      const hasMaxReplies = thread.reply_count >= MAX_REPLIES;

      console.log(
        `[Archiver] Archiving thread ${thread.id} (stale: ${isStale}, max replies: ${hasMaxReplies})`
      );

      // Get replies before archiving
      const replies = await getReplies(thread.id);

      // Archive to archived_threads table
      await archiveThread(thread, replies);

      // Remove from active threads table
      await deleteThread(thread.id);

      archivedCount++;
    }

    if (archivedCount > 0) {
      console.log(`[Archiver] Archived ${archivedCount} threads`);
    }
  } catch (error) {
    console.error("[Archiver] Error during archival:", error);
  } finally {
    isRunning = false;
  }
}

export function startArchiver(): void {
  if (intervalId) {
    console.log("[Archiver] Already started");
    return;
  }

  console.log(`[Archiver] Starting with interval of ${ARCHIVE_INTERVAL_MS}ms`);
  
  // Run immediately on start
  runArchiver();

  // Then run on interval
  intervalId = setInterval(runArchiver, ARCHIVE_INTERVAL_MS);
}

export function stopArchiver(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Archiver] Stopped");
  }
}

import { archiveThread } from "./postgres";
import { getThreadsToArchive, getReplies, deleteThread } from "./threads";

// Archival thresholds
const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_REPLIES = 100;
const ARCHIVE_INTERVAL_MS = 30 * 1000; // 30 seconds

let isRunning = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

export async function runArchiver(): Promise<void> {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    // Get all threads that need to be archived
    const threadsToArchive = await getThreadsToArchive(
      STALE_THRESHOLD_MS,
      MAX_REPLIES
    );
    let archivedCount = 0;

    for (const thread of threadsToArchive) {
      const isStale =
        Date.now() - new Date(thread.bumped_at).getTime() > STALE_THRESHOLD_MS;
      const hasMaxReplies = thread.reply_count >= MAX_REPLIES;

      // Get replies before archiving
      const replies = await getReplies(thread.id);

      // Archive to archived_threads table
      await archiveThread(thread, replies);

      // Remove from active threads table
      await deleteThread(thread.id);

      archivedCount++;
    }
  } catch (error) {
    console.error("[Archiver] Error during archival:", error);
  } finally {
    isRunning = false;
  }
}

export function startArchiver(): void {
  if (intervalId) {
    return;
  }

  // Run immediately on start
  runArchiver();

  // Then run on interval
  intervalId = setInterval(runArchiver, ARCHIVE_INTERVAL_MS);
}

export function stopArchiver(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

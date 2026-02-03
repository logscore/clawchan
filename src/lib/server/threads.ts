import type { Thread, Reply } from "$lib/types";

import { eq, desc, sql } from "drizzle-orm";

import { db, threads, replies } from "./db";

// Thread operations
export async function saveThread(thread: Thread): Promise<void> {
  await db
    .insert(threads)
    .values({
      agentName: thread.agent_name,
      board: thread.board,
      bumpedAt: new Date(thread.bumped_at),
      content: thread.content,
      createdAt: new Date(thread.created_at),
      id: thread.id,
      imageUrl: thread.image_url,
      replyCount: thread.reply_count,
      tripcode: thread.tripcode,
    })
    .onConflictDoUpdate({
      set: {
        bumpedAt: new Date(thread.bumped_at),
        content: thread.content,
        replyCount: thread.reply_count,
      },
      target: threads.id,
    });
}

export async function getThread(id: string): Promise<Thread | null> {
  const rows = await db
    .select()
    .from(threads)
    .where(eq(threads.id, id))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    agent_name: row.agentName,
    archived: false,
    board: row.board,
    bumped_at: row.bumpedAt.toISOString(),
    content: row.content,
    created_at: row.createdAt.toISOString(),
    id: row.id,
    image_url: row.imageUrl,
    reply_count: row.replyCount,
    tripcode: row.tripcode,
  };
}

export async function updateThreadBump(id: string): Promise<void> {
  await db
    .update(threads)
    .set({
      bumpedAt: new Date(),
      replyCount: sql`${threads.replyCount} + 1`,
    })
    .where(eq(threads.id, id));
}

export async function deleteThread(id: string): Promise<void> {
  // Replies are deleted automatically via CASCADE
  await db.delete(threads).where(eq(threads.id, id));
}

// Reply operations
export async function saveReply(threadId: string, reply: Reply): Promise<void> {
  await db
    .insert(replies)
    .values({
      agentName: reply.agent_name,
      content: reply.content,
      createdAt: new Date(reply.created_at),
      id: reply.id,
      imageUrl: reply.image_url,
      threadId: threadId,
      tripcode: reply.tripcode,
    })
    .onConflictDoNothing();
}

export async function getReplies(threadId: string): Promise<Reply[]> {
  const rows = await db
    .select()
    .from(replies)
    .where(eq(replies.threadId, threadId))
    .orderBy(replies.createdAt);

  return rows.map((row) => ({
    agent_name: row.agentName,
    content: row.content,
    created_at: row.createdAt.toISOString(),
    id: row.id,
    image_url: row.imageUrl,
    thread_id: row.threadId,
    tripcode: row.tripcode,
  }));
}

export async function getRecentReplies(
  threadId: string,
  count: number = 3
): Promise<Reply[]> {
  const rows = await db
    .select()
    .from(replies)
    .where(eq(replies.threadId, threadId))
    .orderBy(desc(replies.createdAt))
    .limit(count);

  // Reverse to get chronological order (oldest first)
  return rows.toReversed().map((row) => ({
    agent_name: row.agentName,
    content: row.content,
    created_at: row.createdAt.toISOString(),
    id: row.id,
    image_url: row.imageUrl,
    thread_id: row.threadId,
    tripcode: row.tripcode,
  }));
}

// Board operations
export async function getBoardThreadIds(
  board: string,
  offset: number = 0,
  limit: number = 20
): Promise<string[]> {
  const rows = await db
    .select({ id: threads.id })
    .from(threads)
    .where(eq(threads.board, board))
    .orderBy(desc(threads.bumpedAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => row.id);
}

export async function getAllBoardThreadIds(board: string): Promise<string[]> {
  const rows = await db
    .select({ id: threads.id })
    .from(threads)
    .where(eq(threads.board, board))
    .orderBy(desc(threads.bumpedAt));

  return rows.map((row) => row.id);
}

// Get all threads for a board with data
export async function getBoardThreads(
  board: string,
  offset: number = 0,
  limit: number = 20
): Promise<Thread[]> {
  const rows = await db
    .select()
    .from(threads)
    .where(eq(threads.board, board))
    .orderBy(desc(threads.bumpedAt))
    .limit(limit)
    .offset(offset);

  const threadsWithReplies: Thread[] = [];

  for (const row of rows) {
    const recentReplies = await getRecentReplies(row.id);
    threadsWithReplies.push({
      agent_name: row.agentName,
      archived: false,
      board: row.board,
      bumped_at: row.bumpedAt.toISOString(),
      content: row.content,
      created_at: row.createdAt.toISOString(),
      id: row.id,
      image_url: row.imageUrl,
      recent_replies: recentReplies,
      reply_count: row.replyCount,
      tripcode: row.tripcode,
    });
  }

  return threadsWithReplies;
}

// Post type for unified post lookup (thread or reply)
export interface Post {
  id: string;
  thread_id: string | null; // null if this is a thread (OP)
  board: string;
  content: string;
  image_url: string | null;
  agent_name: string | null;
  tripcode: string | null;
  created_at: string;
  is_op: boolean;
}

// Get any post by ID (thread or reply)
export async function getPostById(id: string): Promise<Post | null> {
  // First check if it's a thread
  const threadRows = await db
    .select()
    .from(threads)
    .where(eq(threads.id, id))
    .limit(1);

  if (threadRows.length > 0) {
    const row = threadRows[0];
    return {
      agent_name: row.agentName,
      board: row.board,
      content: row.content,
      created_at: row.createdAt.toISOString(),
      id: row.id,
      image_url: row.imageUrl,
      is_op: true,
      thread_id: null,
      tripcode: row.tripcode,
    };
  }

  // Check if it's a reply
  const replyRows = await db
    .select({
      reply: replies,
      thread: threads,
    })
    .from(replies)
    .innerJoin(threads, eq(replies.threadId, threads.id))
    .where(eq(replies.id, id))
    .limit(1);

  if (replyRows.length > 0) {
    const { reply, thread } = replyRows[0];
    return {
      agent_name: reply.agentName,
      board: thread.board,
      content: reply.content,
      created_at: reply.createdAt.toISOString(),
      id: reply.id,
      image_url: reply.imageUrl,
      is_op: false,
      thread_id: reply.threadId,
      tripcode: reply.tripcode,
    };
  }

  return null;
}

// Get all threads that should be archived (stale or max replies)
export async function getThreadsToArchive(
  staleThresholdMs: number,
  maxReplies: number
): Promise<Thread[]> {
  const staleDate = new Date(Date.now() - staleThresholdMs);

  const rows = await db
    .select()
    .from(threads)
    .where(
      sql`${threads.bumpedAt} < ${staleDate} OR ${threads.replyCount} >= ${maxReplies}`
    );

  return rows.map((row) => ({
    agent_name: row.agentName,
    archived: false,
    board: row.board,
    bumped_at: row.bumpedAt.toISOString(),
    content: row.content,
    created_at: row.createdAt.toISOString(),
    id: row.id,
    image_url: row.imageUrl,
    reply_count: row.replyCount,
    tripcode: row.tripcode,
  }));
}

// Get total counts for stats (active threads and replies only)
export async function getStats(): Promise<{
  threadCount: number;
  postCount: number;
}> {
  const [threadResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(threads);

  const [replyResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(replies);

  const threadCount = threadResult?.count ?? 0;
  const replyCount = replyResult?.count ?? 0;

  return {
    postCount: threadCount + replyCount,
    threadCount, // Total posts = threads + replies
  };
}

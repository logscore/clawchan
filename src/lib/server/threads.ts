import { eq, desc, sql } from "drizzle-orm";
import { db, threads, replies } from "./db";
import type { Thread, Reply } from '$lib/types';

// Thread operations
export async function saveThread(thread: Thread): Promise<void> {
  await db
    .insert(threads)
    .values({
      id: thread.id,
      board: thread.board,
      content: thread.content,
      imageUrl: thread.image_url,
      agentName: thread.agent_name,
      tripcode: thread.tripcode,
      createdAt: new Date(thread.created_at),
      bumpedAt: new Date(thread.bumped_at),
      replyCount: thread.reply_count,
    })
    .onConflictDoUpdate({
      target: threads.id,
      set: {
        content: thread.content,
        bumpedAt: new Date(thread.bumped_at),
        replyCount: thread.reply_count,
      },
    });
}

export async function getThread(id: string): Promise<Thread | null> {
  const rows = await db
    .select()
    .from(threads)
    .where(eq(threads.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    board: row.board,
    content: row.content,
    image_url: row.imageUrl,
    agent_name: row.agentName,
    tripcode: row.tripcode,
    created_at: row.createdAt.toISOString(),
    bumped_at: row.bumpedAt.toISOString(),
    reply_count: row.replyCount,
    archived: false,
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
      id: reply.id,
      threadId: threadId,
      content: reply.content,
      imageUrl: reply.image_url,
      agentName: reply.agent_name,
      tripcode: reply.tripcode,
      createdAt: new Date(reply.created_at),
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
    id: row.id,
    thread_id: row.threadId,
    content: row.content,
    image_url: row.imageUrl,
    agent_name: row.agentName,
    tripcode: row.tripcode,
    created_at: row.createdAt.toISOString(),
  }));
}

export async function getRecentReplies(threadId: string, count: number = 3): Promise<Reply[]> {
  const rows = await db
    .select()
    .from(replies)
    .where(eq(replies.threadId, threadId))
    .orderBy(desc(replies.createdAt))
    .limit(count);

  // Reverse to get chronological order (oldest first)
  return rows.reverse().map((row) => ({
    id: row.id,
    thread_id: row.threadId,
    content: row.content,
    image_url: row.imageUrl,
    agent_name: row.agentName,
    tripcode: row.tripcode,
    created_at: row.createdAt.toISOString(),
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
      id: row.id,
      board: row.board,
      content: row.content,
      image_url: row.imageUrl,
      agent_name: row.agentName,
      tripcode: row.tripcode,
      created_at: row.createdAt.toISOString(),
      bumped_at: row.bumpedAt.toISOString(),
      reply_count: row.replyCount,
      archived: false,
      recent_replies: recentReplies,
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
      id: row.id,
      thread_id: null,
      board: row.board,
      content: row.content,
      image_url: row.imageUrl,
      agent_name: row.agentName,
      tripcode: row.tripcode,
      created_at: row.createdAt.toISOString(),
      is_op: true,
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
      id: reply.id,
      thread_id: reply.threadId,
      board: thread.board,
      content: reply.content,
      image_url: reply.imageUrl,
      agent_name: reply.agentName,
      tripcode: reply.tripcode,
      created_at: reply.createdAt.toISOString(),
      is_op: false,
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
    id: row.id,
    board: row.board,
    content: row.content,
    image_url: row.imageUrl,
    agent_name: row.agentName,
    tripcode: row.tripcode,
    created_at: row.createdAt.toISOString(),
    bumped_at: row.bumpedAt.toISOString(),
    reply_count: row.replyCount,
    archived: false,
  }));
}

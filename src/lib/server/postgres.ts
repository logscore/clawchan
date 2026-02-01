import { eq, desc } from "drizzle-orm";
import { db, pool, archivedThreads, archivedReplies } from "./db";
import type { Thread, Reply } from '$lib/types';

// Initialize the database schema (run migrations)
export async function initDatabase(): Promise<void> {
  // Create extension
  await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Create active threads table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      board TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      agent_name TEXT,
      tripcode TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      bumped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reply_count INT NOT NULL DEFAULT 0,
      CONSTRAINT valid_active_board CHECK (board ~ '^[a-z]+$')
    )
  `);

  // Create active replies table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      image_url TEXT,
      agent_name TEXT,
      tripcode TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Create archived threads table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS archived_threads (
      id TEXT PRIMARY KEY,
      board TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      agent_name TEXT,
      tripcode TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reply_count INT NOT NULL,
      CONSTRAINT valid_board CHECK (board ~ '^[a-z]+$')
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS archived_replies (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES archived_threads(id),
      content TEXT NOT NULL,
      image_url TEXT,
      agent_name TEXT,
      tripcode TEXT,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  // Create indexes for active tables
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_active_threads_board ON threads(board)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_active_threads_bumped ON threads(bumped_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_active_replies_thread ON replies(thread_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_active_replies_created ON replies(created_at)`);

  // Create indexes for archived tables
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_threads_board ON archived_threads(board)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_threads_archived_at ON archived_threads(archived_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_replies_thread ON archived_replies(thread_id)`);
}

// Archive a thread (move from Redis to Postgres)
export async function archiveThread(thread: Thread, replies: Reply[]): Promise<void> {
  // Insert thread
  await db
    .insert(archivedThreads)
    .values({
      id: thread.id,
      board: thread.board,
      content: thread.content,
      imageUrl: thread.image_url,
      agentName: thread.agent_name,
      tripcode: thread.tripcode,
      createdAt: new Date(thread.created_at),
      replyCount: thread.reply_count,
    })
    .onConflictDoNothing();

  // Insert replies
  if (replies.length > 0) {
    await db
      .insert(archivedReplies)
      .values(
        replies.map((reply) => ({
          id: reply.id,
          threadId: thread.id,
          content: reply.content,
          imageUrl: reply.image_url,
          agentName: reply.agent_name,
          tripcode: reply.tripcode,
          createdAt: new Date(reply.created_at),
        }))
      )
      .onConflictDoNothing();
  }
}

// Get archived thread by ID
export async function getArchivedThread(id: string): Promise<Thread | null> {
  const rows = await db
    .select()
    .from(archivedThreads)
    .where(eq(archivedThreads.id, id))
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
    bumped_at: row.archivedAt.toISOString(),
    reply_count: row.replyCount,
    archived: true,
  };
}

// Get archived replies for a thread
export async function getArchivedReplies(threadId: string): Promise<Reply[]> {
  const rows = await db
    .select()
    .from(archivedReplies)
    .where(eq(archivedReplies.threadId, threadId))
    .orderBy(archivedReplies.createdAt);

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

// Get archived threads for a board (paginated)
export async function getArchivedThreads(
  board: string,
  offset: number = 0,
  limit: number = 20
): Promise<Thread[]> {
  const rows = await db
    .select()
    .from(archivedThreads)
    .where(eq(archivedThreads.board, board))
    .orderBy(desc(archivedThreads.archivedAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    id: row.id,
    board: row.board,
    content: row.content,
    image_url: row.imageUrl,
    agent_name: row.agentName,
    tripcode: row.tripcode,
    created_at: row.createdAt.toISOString(),
    bumped_at: row.archivedAt.toISOString(),
    reply_count: row.replyCount,
    archived: true,
  }));
}

// Close connection
export async function closePostgres(): Promise<void> {
  await pool.end();
}

import { pgTable, text, timestamp, integer, index, check } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Active threads (live on the board)
export const threads = pgTable(
  "threads",
  {
    id: text("id").primaryKey(),
    board: text("board").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    agentName: text("agent_name"),
    tripcode: text("tripcode"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    bumpedAt: timestamp("bumped_at", { withTimezone: true }).notNull().defaultNow(),
    replyCount: integer("reply_count").notNull().default(0),
  },
  (table) => [
    index("idx_active_threads_board").on(table.board),
    index("idx_active_threads_bumped").on(table.bumpedAt.desc()),
    check("valid_active_board", sql`${table.board} ~ '^[a-z]+$'`),
  ]
);

// Active replies (for live threads)
export const replies = pgTable(
  "replies",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    agentName: text("agent_name"),
    tripcode: text("tripcode"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_active_replies_thread").on(table.threadId),
    index("idx_active_replies_created").on(table.createdAt),
  ]
);

// Relations for active threads
export const threadsRelations = relations(threads, ({ many }) => ({
  replies: many(replies),
}));

export const repliesRelations = relations(replies, ({ one }) => ({
  thread: one(threads, {
    fields: [replies.threadId],
    references: [threads.id],
  }),
}));

// Archived threads (moved from active after TTL or max replies)
export const archivedThreads = pgTable(
  "archived_threads",
  {
    id: text("id").primaryKey(),
    board: text("board").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    agentName: text("agent_name"),
    tripcode: text("tripcode"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }).notNull().defaultNow(),
    replyCount: integer("reply_count").notNull(),
  },
  (table) => [
    index("idx_threads_board").on(table.board),
    index("idx_threads_archived_at").on(table.archivedAt.desc()),
    check("valid_board", sql`${table.board} ~ '^[a-z]+$'`),
  ]
);

export const archivedReplies = pgTable(
  "archived_replies",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => archivedThreads.id),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    agentName: text("agent_name"),
    tripcode: text("tripcode"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_replies_thread").on(table.threadId),
  ]
);

// Relations
export const archivedThreadsRelations = relations(archivedThreads, ({ many }) => ({
  replies: many(archivedReplies),
}));

export const archivedRepliesRelations = relations(archivedReplies, ({ one }) => ({
  thread: one(archivedThreads, {
    fields: [archivedReplies.threadId],
    references: [archivedThreads.id],
  }),
}));

// Type exports
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Reply = typeof replies.$inferSelect;
export type NewReply = typeof replies.$inferInsert;
export type ArchivedThread = typeof archivedThreads.$inferSelect;
export type NewArchivedThread = typeof archivedThreads.$inferInsert;
export type ArchivedReply = typeof archivedReplies.$inferSelect;
export type NewArchivedReply = typeof archivedReplies.$inferInsert;

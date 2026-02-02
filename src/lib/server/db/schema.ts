import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  check,
} from "drizzle-orm/pg-core";

// Active threads (live on the board)
export const threads = pgTable(
  "threads",
  {
    agentName: text("agent_name"),
    board: text("board").notNull(),
    bumpedAt: timestamp("bumped_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey(),
    imageUrl: text("image_url"),
    replyCount: integer("reply_count").notNull().default(0),
    tripcode: text("tripcode"),
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
    agentName: text("agent_name"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey(),
    imageUrl: text("image_url"),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    tripcode: text("tripcode"),
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
    agentName: text("agent_name"),
    archivedAt: timestamp("archived_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    board: text("board").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    id: text("id").primaryKey(),
    imageUrl: text("image_url"),
    replyCount: integer("reply_count").notNull(),
    tripcode: text("tripcode"),
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
    agentName: text("agent_name"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    id: text("id").primaryKey(),
    imageUrl: text("image_url"),
    threadId: text("thread_id")
      .notNull()
      .references(() => archivedThreads.id),
    tripcode: text("tripcode"),
  },
  (table) => [index("idx_replies_thread").on(table.threadId)]
);

// Relations
export const archivedThreadsRelations = relations(
  archivedThreads,
  ({ many }) => ({
    replies: many(archivedReplies),
  })
);

export const archivedRepliesRelations = relations(
  archivedReplies,
  ({ one }) => ({
    thread: one(archivedThreads, {
      fields: [archivedReplies.threadId],
      references: [archivedThreads.id],
    }),
  })
);

// Type exports
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Reply = typeof replies.$inferSelect;
export type NewReply = typeof replies.$inferInsert;
export type ArchivedThread = typeof archivedThreads.$inferSelect;
export type NewArchivedThread = typeof archivedThreads.$inferInsert;
export type ArchivedReply = typeof archivedReplies.$inferSelect;
export type NewArchivedReply = typeof archivedReplies.$inferInsert;

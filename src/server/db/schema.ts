import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "image",
  "carousel",
  "reel",
]);

export const mediaItemTypeEnum = pgEnum("media_item_type", [
  "image",
  "video",
]);

export const batchStatusEnum = pgEnum("batch_status", [
  "processing",
  "ready",
  "partially_scheduled",
  "completed",
  "failed",
]);

// Tables
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  instagramUserId: text("instagram_user_id").unique().notNull(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  profilePicUrl: text("profile_pic_url"),
  accessToken: text("access_token").notNull(), // encrypted
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
  facebookPageId: text("facebook_page_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  postingConfig: jsonb("posting_config").$type<{
    maxPostsPerDay: number;
    postingWindows: { start: string; end: string }[];
    timezone: string;
    minGapMinutes: number;
    blackoutDates: string[];
  }>().default({
    maxPostsPerDay: 5,
    postingWindows: [
      { start: "09:00", end: "12:00" },
      { start: "17:00", end: "21:00" },
    ],
    timezone: "UTC",
    minGapMinutes: 120,
    blackoutDates: [],
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(),
  status: postStatusEnum("status").default("draft").notNull(),
  caption: text("caption"),
  hashtags: text("hashtags"),
  mediaType: mediaTypeEnum("media_type").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  igMediaId: text("ig_media_id"),
  igContainerId: text("ig_container_id"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  batchId: uuid("batch_id").references(() => batches.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const postMedia = pgTable("post_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  mediaUrl: text("media_url").notNull(), // S3 public URL
  mediaType: mediaItemTypeEnum("media_type").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  altText: text("alt_text"),
  igContainerId: text("ig_container_id"),
});

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  captionTemplate: text("caption_template"),
  defaultHashtags: text("default_hashtags"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename"),
  totalPosts: integer("total_posts").default(0).notNull(),
  status: batchStatusEnum("status").default("processing").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tokenRefreshLog = pgTable("token_refresh_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).defaultNow().notNull(),
  oldExpiry: timestamp("old_expiry", { withTimezone: true }),
  newExpiry: timestamp("new_expiry", { withTimezone: true }),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
});

// Relations
export const accountsRelations = relations(accounts, ({ many }) => ({
  posts: many(posts),
  tokenRefreshLogs: many(tokenRefreshLog),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  account: one(accounts, {
    fields: [posts.accountId],
    references: [accounts.id],
  }),
  media: many(postMedia),
  batch: one(batches, {
    fields: [posts.batchId],
    references: [batches.id],
  }),
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, {
    fields: [postMedia.postId],
    references: [posts.id],
  }),
}));

export const batchesRelations = relations(batches, ({ many }) => ({
  posts: many(posts),
}));

export const tokenRefreshLogRelations = relations(tokenRefreshLog, ({ one }) => ({
  account: one(accounts, {
    fields: [tokenRefreshLog.accountId],
    references: [accounts.id],
  }),
}));

// Types
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostMedia = typeof postMedia.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Batch = typeof batches.$inferSelect;

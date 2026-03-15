import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "published",
  "archived",
]);

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  status: postStatusEnum("status").notNull().default("draft"),
  category: text("category"),
  tags: text("tags").array().notNull().default([]),
  viewCount: integer("view_count").notNull().default(0),
  authorId: integer("author_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({
  id: true,
  slug: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const createPostSchema = z.object({
  title: z.string().min(3).max(255),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional().default([]),
  authorId: z.number().int().positive(),
});

export const updatePostSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  content: z.string().min(10).optional(),
  excerpt: z.string().max(500).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;

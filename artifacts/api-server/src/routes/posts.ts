import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable, commentsTable, createPostSchema, updatePostSchema } from "@workspace/db/schema";
import { eq, sql, and, count, asc, desc } from "drizzle-orm";
import { notFound, badRequest } from "../lib/errors.js";
import { parsePagination, buildMeta } from "../lib/pagination.js";
import { uniqueSlug } from "../lib/slugify.js";

const router: IRouter = Router();

router.get("/posts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const search = req.query["search"] as string | undefined;
    const status = req.query["status"] as string | undefined;
    const category = req.query["category"] as string | undefined;
    const sortBy = (req.query["sortBy"] as string) || "createdAt";
    const order = (req.query["order"] as string) || "desc";

    const conditions = [];

    if (search) {
      conditions.push(
        sql`(${postsTable.title} ILIKE ${`%${search}%`} OR ${postsTable.content} ILIKE ${`%${search}%`})`
      );
    }
    if (status && ["draft", "published", "archived"].includes(status)) {
      conditions.push(eq(postsTable.status, status as "draft" | "published" | "archived"));
    }
    if (category) {
      conditions.push(eq(postsTable.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortMap: Record<string, typeof postsTable.createdAt> = {
      createdAt: postsTable.createdAt,
      updatedAt: postsTable.updatedAt,
      title: postsTable.title as typeof postsTable.createdAt,
      viewCount: postsTable.viewCount as typeof postsTable.createdAt,
    };

    const sortCol = sortMap[sortBy] ?? postsTable.createdAt;
    const orderFn = order === "asc" ? asc : desc;

    const [totalResult, posts] = await Promise.all([
      db.select({ count: count() }).from(postsTable).where(whereClause),
      db
        .select({
          id: postsTable.id,
          title: postsTable.title,
          slug: postsTable.slug,
          content: postsTable.content,
          excerpt: postsTable.excerpt,
          status: postsTable.status,
          category: postsTable.category,
          tags: postsTable.tags,
          viewCount: postsTable.viewCount,
          authorId: postsTable.authorId,
          createdAt: postsTable.createdAt,
          updatedAt: postsTable.updatedAt,
          commentCount: sql<number>`CAST(COUNT(${commentsTable.id}) AS INTEGER)`,
          author: {
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            role: usersTable.role,
            bio: usersTable.bio,
            avatarUrl: usersTable.avatarUrl,
            isActive: usersTable.isActive,
            postCount: sql<number>`CAST(0 AS INTEGER)`,
            createdAt: usersTable.createdAt,
            updatedAt: usersTable.updatedAt,
          },
        })
        .from(postsTable)
        .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
        .leftJoin(commentsTable, eq(commentsTable.postId, postsTable.id))
        .where(whereClause)
        .groupBy(postsTable.id, usersTable.id)
        .orderBy(orderFn(sortCol))
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;
    res.json({ data: posts, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
});

router.post("/posts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const { title, content, excerpt, status, category, tags, authorId } = parsed.data;

    const authorExists = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, authorId))
      .limit(1);

    if (authorExists.length === 0) throw badRequest("Author user not found");

    const slug = uniqueSlug(title);

    const [post] = await db
      .insert(postsTable)
      .values({
        title,
        slug,
        content,
        excerpt: excerpt ?? null,
        status: status ?? "draft",
        category: category ?? null,
        tags: tags ?? [],
        authorId,
      })
      .returning();

    const [author] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, authorId))
      .limit(1);

    res.status(201).json({
      data: {
        ...post,
        commentCount: 0,
        author: author ? { ...author, postCount: 0 } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/posts/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params["id"]!, 10);
    if (isNaN(id)) throw badRequest("Invalid post ID");

    const [post] = await db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        slug: postsTable.slug,
        content: postsTable.content,
        excerpt: postsTable.excerpt,
        status: postsTable.status,
        category: postsTable.category,
        tags: postsTable.tags,
        viewCount: postsTable.viewCount,
        authorId: postsTable.authorId,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        commentCount: sql<number>`CAST(COUNT(${commentsTable.id}) AS INTEGER)`,
        author: {
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          bio: usersTable.bio,
          avatarUrl: usersTable.avatarUrl,
          isActive: usersTable.isActive,
          postCount: sql<number>`CAST(0 AS INTEGER)`,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
        },
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .leftJoin(commentsTable, eq(commentsTable.postId, postsTable.id))
      .where(eq(postsTable.id, id))
      .groupBy(postsTable.id, usersTable.id)
      .limit(1);

    if (!post) throw notFound("Post");

    await db
      .update(postsTable)
      .set({ viewCount: sql`${postsTable.viewCount} + 1` })
      .where(eq(postsTable.id, id));

    res.json({ data: post });
  } catch (err) {
    next(err);
  }
});

router.put("/posts/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params["id"]!, 10);
    if (isNaN(id)) throw badRequest("Invalid post ID");

    const parsed = updatePostSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const existing = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, id))
      .limit(1);

    if (existing.length === 0) throw notFound("Post");

    const updates: Partial<typeof postsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.title !== undefined) {
      updates.title = parsed.data.title;
      updates.slug = uniqueSlug(parsed.data.title);
    }
    if (parsed.data.content !== undefined) updates.content = parsed.data.content;
    if (parsed.data.excerpt !== undefined) updates.excerpt = parsed.data.excerpt;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.category !== undefined) updates.category = parsed.data.category;
    if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;

    await db.update(postsTable).set(updates).where(eq(postsTable.id, id));

    const [updated] = await db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        slug: postsTable.slug,
        content: postsTable.content,
        excerpt: postsTable.excerpt,
        status: postsTable.status,
        category: postsTable.category,
        tags: postsTable.tags,
        viewCount: postsTable.viewCount,
        authorId: postsTable.authorId,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        commentCount: sql<number>`CAST(COUNT(${commentsTable.id}) AS INTEGER)`,
        author: {
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          bio: usersTable.bio,
          avatarUrl: usersTable.avatarUrl,
          isActive: usersTable.isActive,
          postCount: sql<number>`CAST(0 AS INTEGER)`,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
        },
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .leftJoin(commentsTable, eq(commentsTable.postId, postsTable.id))
      .where(eq(postsTable.id, id))
      .groupBy(postsTable.id, usersTable.id)
      .limit(1);

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/posts/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params["id"]!, 10);
    if (isNaN(id)) throw badRequest("Invalid post ID");

    const existing = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, id))
      .limit(1);

    if (existing.length === 0) throw notFound("Post");

    await db.delete(postsTable).where(eq(postsTable.id, id));

    res.json({ message: "Post successfully deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;

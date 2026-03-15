import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { commentsTable, usersTable, postsTable, createCommentSchema, updateCommentSchema } from "@workspace/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { notFound, badRequest } from "../lib/errors.js";
import { parsePagination, buildMeta } from "../lib/pagination.js";

const router: IRouter = Router();

router.get("/posts/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = parseInt(req.params["id"]!, 10);
    if (isNaN(postId)) throw badRequest("Invalid post ID");

    const postExists = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);

    if (postExists.length === 0) throw notFound("Post");

    const { page, limit, offset } = parsePagination(req);

    const [totalResult, comments] = await Promise.all([
      db
        .select({ count: count() })
        .from(commentsTable)
        .where(eq(commentsTable.postId, postId)),
      db
        .select({
          id: commentsTable.id,
          content: commentsTable.content,
          postId: commentsTable.postId,
          authorId: commentsTable.authorId,
          createdAt: commentsTable.createdAt,
          updatedAt: commentsTable.updatedAt,
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
        .from(commentsTable)
        .leftJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
        .where(eq(commentsTable.postId, postId))
        .orderBy(sql`${commentsTable.createdAt} ASC`)
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;
    res.json({ data: comments, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
});

router.post("/posts/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = parseInt(req.params["id"]!, 10);
    if (isNaN(postId)) throw badRequest("Invalid post ID");

    const postExists = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);

    if (postExists.length === 0) throw notFound("Post");

    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const { content, authorId } = parsed.data;

    const authorExists = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, authorId))
      .limit(1);

    if (authorExists.length === 0) throw badRequest("Author user not found");

    const [comment] = await db
      .insert(commentsTable)
      .values({ content, postId, authorId })
      .returning();

    const [author] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, authorId))
      .limit(1);

    res.status(201).json({
      data: {
        ...comment,
        author: author ? { ...author, postCount: 0 } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put("/comments/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params["id"]!, 10);
    if (isNaN(id)) throw badRequest("Invalid comment ID");

    const parsed = updateCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const existing = await db
      .select({ id: commentsTable.id, authorId: commentsTable.authorId })
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);

    if (existing.length === 0) throw notFound("Comment");

    const [updated] = await db
      .update(commentsTable)
      .set({ content: parsed.data.content, updatedAt: new Date() })
      .where(eq(commentsTable.id, id))
      .returning();

    const [author] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updated!.authorId))
      .limit(1);

    res.json({
      data: {
        ...updated,
        author: author ? { ...author, postCount: 0 } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/comments/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params["id"]!, 10);
    if (isNaN(id)) throw badRequest("Invalid comment ID");

    const existing = await db
      .select({ id: commentsTable.id })
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1);

    if (existing.length === 0) throw notFound("Comment");

    await db.delete(commentsTable).where(eq(commentsTable.id, id));

    res.json({ message: "Comment successfully deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;

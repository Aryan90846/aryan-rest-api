import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, createUserSchema, updateUserSchema } from "@workspace/db/schema";
import { eq, ilike, sql, and, count } from "drizzle-orm";
import { postsTable } from "@workspace/db/schema";
import { notFound, conflict, badRequest } from "../lib/errors.js";
import { parsePagination, buildMeta } from "../lib/pagination.js";

const router: IRouter = Router();

router.get("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const search = req.query["search"] as string | undefined;
    const role = req.query["role"] as string | undefined;

    const conditions = [];
    conditions.push(eq(usersTable.isActive, true));

    if (search) {
      conditions.push(
        sql`(${usersTable.name} ILIKE ${`%${search}%`} OR ${usersTable.email} ILIKE ${`%${search}%`})`
      );
    }

    if (role && ["admin", "user", "moderator"].includes(role)) {
      conditions.push(eq(usersTable.role, role as "admin" | "user" | "moderator"));
    }

    const whereClause = and(...conditions);

    const [totalResult, users] = await Promise.all([
      db.select({ count: count() }).from(usersTable).where(whereClause),
      db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          bio: usersTable.bio,
          avatarUrl: usersTable.avatarUrl,
          isActive: usersTable.isActive,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
          postCount: sql<number>`CAST(COUNT(${postsTable.id}) AS INTEGER)`,
        })
        .from(usersTable)
        .leftJoin(postsTable, eq(postsTable.authorId, usersTable.id))
        .where(whereClause)
        .groupBy(usersTable.id)
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;

    res.json({ data: users, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
});

router.post("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const { name, email, role, bio, avatarUrl } = parsed.data;

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw conflict(`A user with email "${email}" already exists`);
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email: email.toLowerCase(),
        role: role ?? "user",
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
      })
      .returning();

    res.status(201).json({ data: { ...user, postCount: 0 } });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params["id"]!, 10);
    if (isNaN(id)) throw badRequest("Invalid user ID");

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        bio: usersTable.bio,
        avatarUrl: usersTable.avatarUrl,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
        postCount: sql<number>`CAST(COUNT(${postsTable.id}) AS INTEGER)`,
      })
      .from(usersTable)
      .leftJoin(postsTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(usersTable.id, id))
      .groupBy(usersTable.id)
      .limit(1);

    if (!user) throw notFound("User");

    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

router.put("/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params["id"]!, 10);
    if (isNaN(id)) throw badRequest("Invalid user ID");

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (existing.length === 0) throw notFound("User");

    const updates: Partial<typeof usersTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email.toLowerCase();
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
    if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl;
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, id))
      .returning();

    const [withCount] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        bio: usersTable.bio,
        avatarUrl: usersTable.avatarUrl,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
        postCount: sql<number>`CAST(COUNT(${postsTable.id}) AS INTEGER)`,
      })
      .from(usersTable)
      .leftJoin(postsTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(usersTable.id, updated!.id))
      .groupBy(usersTable.id)
      .limit(1);

    res.json({ data: withCount });
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params["id"]!, 10);
    if (isNaN(id)) throw badRequest("Invalid user ID");

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (existing.length === 0) throw notFound("User");

    await db
      .update(usersTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(usersTable.id, id));

    res.json({ message: "User successfully deactivated" });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id/posts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params["id"]!, 10);
    if (isNaN(id)) throw badRequest("Invalid user ID");

    const userExists = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (userExists.length === 0) throw notFound("User");

    const { page, limit, offset } = parsePagination(req);

    const [totalResult, posts] = await Promise.all([
      db.select({ count: count() }).from(postsTable).where(eq(postsTable.authorId, id)),
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
          commentCount: sql<number>`CAST(0 AS INTEGER)`,
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
        .where(eq(postsTable.authorId, id))
        .orderBy(sql`${postsTable.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;
    res.json({ data: posts, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
});

export default router;

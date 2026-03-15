import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import { User, Post, createUserSchema, updateUserSchema } from "@workspace/db";
import { notFound, conflict, badRequest } from "../lib/errors.js";
import { parsePagination, buildMeta } from "../lib/pagination.js";

const router: IRouter = Router();

router.get("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const search = req.query["search"] as string | undefined;
    const role = req.query["role"] as string | undefined;

    const filter: Record<string, unknown> = { isActive: true };

    if (search) {
      filter["$or"] = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role && ["admin", "user", "moderator"].includes(role)) {
      filter["role"] = role;
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean({ virtuals: true }),
    ]);

    const userIds = users.map((u) => u._id);
    const postCounts = await Post.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { authorId: { $in: userIds } } },
      { $group: { _id: "$authorId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(postCounts.map((p) => [p._id.toString(), p.count]));

    const data = users.map((u) => ({
      ...u,
      id: u._id.toString(),
      _id: undefined,
      __v: undefined,
      postCount: countMap.get(u._id.toString()) ?? 0,
    }));

    res.json({ data, meta: buildMeta(total, page, limit) });
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

    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) throw conflict(`A user with email "${email}" already exists`);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      role: role ?? "user",
      bio: bio ?? null,
      avatarUrl: avatarUrl ?? null,
    });

    const json = user.toJSON();
    res.status(201).json({ data: { ...json, postCount: 0 } });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid user ID");

    const user = await User.findById(id).lean({ virtuals: true });
    if (!user) throw notFound("User");

    const postCount = await Post.countDocuments({ authorId: user._id });

    res.json({
      data: {
        ...user,
        id: user._id.toString(),
        _id: undefined,
        __v: undefined,
        postCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put("/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid user ID");

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });

    if (!updated) throw notFound("User");

    const postCount = await Post.countDocuments({ authorId: updated._id });

    res.json({
      data: {
        ...updated,
        id: updated._id.toString(),
        _id: undefined,
        __v: undefined,
        postCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid user ID");

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) throw notFound("User");

    res.json({ message: "User successfully deactivated" });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id/posts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid user ID");

    const user = await User.findById(id).lean();
    if (!user) throw notFound("User");

    const { page, limit, offset } = parsePagination(req);

    const filter = { authorId: user._id };

    const [total, posts] = await Promise.all([
      Post.countDocuments(filter),
      Post.find(filter)
        .populate("authorId", "name email role bio avatarUrl isActive createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean({ virtuals: true }),
    ]);

    const data = posts.map((p) => ({
      ...p,
      id: p._id.toString(),
      _id: undefined,
      __v: undefined,
      authorId: (p.authorId as unknown as mongoose.Types.ObjectId)?.toString?.() ?? p.authorId,
      commentCount: 0,
    }));

    res.json({ data, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
});

export default router;

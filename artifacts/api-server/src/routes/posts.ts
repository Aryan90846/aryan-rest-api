import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import { Post, User, Comment, createPostSchema, updatePostSchema } from "@workspace/db";
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
    const order = (req.query["order"] as string) === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};

    if (search) {
      filter["$or"] = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }
    if (status && ["draft", "published", "archived"].includes(status)) {
      filter["status"] = status;
    }
    if (category) {
      filter["category"] = { $regex: category, $options: "i" };
    }

    const validSortFields: Record<string, string> = {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      title: "title",
      viewCount: "viewCount",
    };
    const sortField = validSortFields[sortBy] ?? "createdAt";

    const [total, posts] = await Promise.all([
      Post.countDocuments(filter),
      Post.find(filter)
        .populate("authorId", "name email role bio avatarUrl isActive createdAt updatedAt")
        .sort({ [sortField]: order })
        .skip(offset)
        .limit(limit)
        .lean({ virtuals: true }),
    ]);

    const postIds = posts.map((p) => p._id);
    const commentCounts = await Comment.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]);
    const commentMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count]));

    const data = posts.map((p) => {
      const author = p.authorId as unknown as Record<string, unknown> | null;
      return {
        ...p,
        id: p._id.toString(),
        _id: undefined,
        __v: undefined,
        authorId: author && "_id" in author ? String(author["_id"]) : String(p.authorId),
        commentCount: commentMap.get(p._id.toString()) ?? 0,
        author: author
          ? {
              ...author,
              id: String(author["_id"]),
              _id: undefined,
              __v: undefined,
              postCount: 0,
            }
          : null,
      };
    });

    res.json({ data, meta: buildMeta(total, page, limit) });
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

    if (!mongoose.isValidObjectId(authorId)) throw badRequest("Invalid authorId");

    const author = await User.findById(authorId).lean({ virtuals: true });
    if (!author) throw badRequest("Author user not found");

    const slug = uniqueSlug(title);

    const post = await Post.create({
      title,
      slug,
      content,
      excerpt: excerpt ?? null,
      status: status ?? "draft",
      category: category ?? null,
      tags: tags ?? [],
      authorId,
    });

    const json = post.toJSON();
    res.status(201).json({
      data: {
        ...json,
        commentCount: 0,
        author: {
          ...author,
          id: author._id.toString(),
          _id: undefined,
          __v: undefined,
          postCount: 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/posts/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid post ID");

    const post = await Post.findById(id)
      .populate("authorId", "name email role bio avatarUrl isActive createdAt updatedAt")
      .lean({ virtuals: true });

    if (!post) throw notFound("Post");

    const [commentCount] = await Promise.all([
      Comment.countDocuments({ postId: post._id }),
      Post.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }),
    ]);

    const author = post.authorId as unknown as Record<string, unknown> | null;

    res.json({
      data: {
        ...post,
        id: post._id.toString(),
        _id: undefined,
        __v: undefined,
        authorId: author && "_id" in author ? String(author["_id"]) : String(post.authorId),
        commentCount,
        author: author
          ? {
              ...author,
              id: String(author["_id"]),
              _id: undefined,
              __v: undefined,
              postCount: 0,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put("/posts/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid post ID");

    const parsed = updatePostSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.title) {
      updates["slug"] = uniqueSlug(parsed.data.title);
    }

    const updated = await Post.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("authorId", "name email role bio avatarUrl isActive createdAt updatedAt")
      .lean({ virtuals: true });

    if (!updated) throw notFound("Post");

    const commentCount = await Comment.countDocuments({ postId: updated._id });
    const author = updated.authorId as unknown as Record<string, unknown> | null;

    res.json({
      data: {
        ...updated,
        id: updated._id.toString(),
        _id: undefined,
        __v: undefined,
        authorId: author && "_id" in author ? String(author["_id"]) : String(updated.authorId),
        commentCount,
        author: author
          ? {
              ...author,
              id: String(author["_id"]),
              _id: undefined,
              __v: undefined,
              postCount: 0,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/posts/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid post ID");

    const post = await Post.findByIdAndDelete(id);
    if (!post) throw notFound("Post");

    await Comment.deleteMany({ postId: post._id });

    res.json({ message: "Post successfully deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;

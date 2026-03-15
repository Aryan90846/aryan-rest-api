import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import { Comment, Post, User, createCommentSchema, updateCommentSchema } from "@workspace/db";
import { notFound, badRequest } from "../lib/errors.js";
import { parsePagination, buildMeta } from "../lib/pagination.js";

const router: IRouter = Router();

router.get("/posts/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid post ID");

    const post = await Post.findById(id).lean();
    if (!post) throw notFound("Post");

    const { page, limit, offset } = parsePagination(req);

    const filter = { postId: post._id };

    const [total, comments] = await Promise.all([
      Comment.countDocuments(filter),
      Comment.find(filter)
        .populate("authorId", "name email role bio avatarUrl isActive createdAt updatedAt")
        .sort({ createdAt: 1 })
        .skip(offset)
        .limit(limit)
        .lean({ virtuals: true }),
    ]);

    const data = comments.map((c) => {
      const author = c.authorId as unknown as Record<string, unknown> | null;
      return {
        ...c,
        id: c._id.toString(),
        _id: undefined,
        __v: undefined,
        postId: c.postId?.toString(),
        authorId: author && "_id" in author ? String(author["_id"]) : String(c.authorId),
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

router.post("/posts/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid post ID");

    const post = await Post.findById(id).lean();
    if (!post) throw notFound("Post");

    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const { content, authorId } = parsed.data;

    if (!mongoose.isValidObjectId(authorId)) throw badRequest("Invalid authorId");

    const author = await User.findById(authorId).lean({ virtuals: true });
    if (!author) throw badRequest("Author user not found");

    const comment = await Comment.create({
      content,
      postId: post._id,
      authorId,
    });

    const json = comment.toJSON();
    res.status(201).json({
      data: {
        ...json,
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

router.put("/comments/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid comment ID");

    const parsed = updateCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw badRequest("Validation failed", details);
    }

    const updated = await Comment.findByIdAndUpdate(
      id,
      { $set: { content: parsed.data.content } },
      { new: true, runValidators: true }
    )
      .populate("authorId", "name email role bio avatarUrl isActive createdAt updatedAt")
      .lean({ virtuals: true });

    if (!updated) throw notFound("Comment");

    const author = updated.authorId as unknown as Record<string, unknown> | null;

    res.json({
      data: {
        ...updated,
        id: updated._id.toString(),
        _id: undefined,
        __v: undefined,
        postId: updated.postId?.toString(),
        authorId: author && "_id" in author ? String(author["_id"]) : String(updated.authorId),
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

router.delete("/comments/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid comment ID");

    const comment = await Comment.findByIdAndDelete(id);
    if (!comment) throw notFound("Comment");

    res.json({ message: "Comment successfully deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;

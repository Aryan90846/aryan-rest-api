import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { z } from "zod/v4";

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: "draft" | "published" | "archived";
  category?: string;
  tags: string[];
  viewCount: number;
  authorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 255 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, required: true, minlength: 10 },
    excerpt: { type: String, maxlength: 500, default: null },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    category: { type: String, maxlength: 100, default: null },
    tags: { type: [String], default: [] },
    viewCount: { type: Number, default: 0, min: 0 },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc: unknown, ret: Record<string, any>) {
        ret.id = String(ret._id);
        ret.authorId = ret.authorId?.toString?.() ?? ret.authorId;
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

PostSchema.index({ slug: 1 });
PostSchema.index({ status: 1 });
PostSchema.index({ authorId: 1 });
PostSchema.index({ category: 1 });
PostSchema.index({ title: "text", content: "text" });

export const Post: Model<IPost> =
  mongoose.models["Post"] ?? mongoose.model<IPost>("Post", PostSchema);

export const createPostSchema = z.object({
  title: z.string().min(3).max(255),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional().default([]),
  authorId: z.string().min(1),
});

export const updatePostSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  content: z.string().min(10).optional(),
  excerpt: z.string().max(500).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { z } from "zod/v4";

export interface IComment extends Document {
  content: string;
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    content: { type: String, required: true, minlength: 1, maxlength: 1000 },
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc: unknown, ret: Record<string, any>) {
        ret.id = String(ret._id);
        ret.postId = ret.postId?.toString?.() ?? ret.postId;
        ret.authorId = ret.authorId?.toString?.() ?? ret.authorId;
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

CommentSchema.index({ postId: 1 });
CommentSchema.index({ authorId: 1 });

export const Comment: Model<IComment> =
  mongoose.models["Comment"] ?? mongoose.model<IComment>("Comment", CommentSchema);

export const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  authorId: z.string().min(1),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

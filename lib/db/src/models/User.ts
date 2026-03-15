import mongoose, { Schema, Document, Model } from "mongoose";
import { z } from "zod/v4";

export interface IUser extends Document {
  name: string;
  email: string;
  role: "admin" | "user" | "moderator";
  bio?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["admin", "user", "moderator"], default: "user" },
    bio: { type: String, maxlength: 500, default: null },
    avatarUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc: unknown, ret: Record<string, any>) {
        ret.id = String(ret._id);
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

UserSchema.index({ role: 1 });
UserSchema.index({ name: "text", email: "text" });

export const User: Model<IUser> =
  mongoose.models["User"] ?? mongoose.model<IUser>("User", UserSchema);

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  role: z.enum(["admin", "user", "moderator"]).optional().default("user"),
  bio: z.string().max(500).optional(),
  avatarUrl: z.url().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.email().optional(),
  role: z.enum(["admin", "user", "moderator"]).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.url().optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

import { model, Schema } from 'mongoose';
import { BlogCommentStatus } from '../libs/enums/blog.enum';
import type { BlogComment } from '../libs/types/blog';

const blogCommentSchema = new Schema<BlogComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'BlogPost',
      required: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5_000,
    },
    status: {
      type: String,
      enum: Object.values(BlogCommentStatus),
      default: BlogCommentStatus.PENDING,
    },
  },
  { timestamps: true, collection: 'blog_comments' },
);

blogCommentSchema.index({ postId: 1, status: 1, createdAt: 1 });
blogCommentSchema.index({ status: 1, createdAt: -1 });
blogCommentSchema.index({ memberId: 1, createdAt: -1 });

export default model<BlogComment>('BlogComment', blogCommentSchema);

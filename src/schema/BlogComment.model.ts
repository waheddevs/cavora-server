import mongoose, { Schema } from 'mongoose';
import { BlogCommentStatus } from '../libs/enums/blog.enum';
import { RATING_MAX, RATING_MIN } from '../libs/rating';
import type { BlogComment } from '../libs/types/blog';

const blogCommentSchema = new Schema<BlogComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'BlogPost',
    },
    tourId: {
      type: Number,
      ref: 'Tour',
      min: 1,
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
    // Tour comments are reviews and carry a star value; blog comments do not.
    rating: {
      type: Number,
      min: RATING_MIN,
      max: RATING_MAX,
      validate: {
        validator: Number.isInteger,
        message: 'rating must be a whole number of stars.',
      },
    },
    status: {
      type: String,
      enum: Object.values(BlogCommentStatus),
      default: BlogCommentStatus.APPROVED,
    },
  },
  { timestamps: true, collection: 'blog_comments' },
);

blogCommentSchema.index({ postId: 1, status: 1, createdAt: 1 });
blogCommentSchema.index({ tourId: 1, status: 1, createdAt: 1 });
blogCommentSchema.index({ status: 1, createdAt: -1 });
blogCommentSchema.index({ memberId: 1, createdAt: -1 });

export default mongoose.model<BlogComment>('BlogComment', blogCommentSchema);

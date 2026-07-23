import mongoose, { Schema } from 'mongoose';
import { BlogPostStatus } from '../libs/enums/blog.enum';
import type { BlogPost } from '../libs/types/blog';

const blogPostSchema = new Schema<BlogPost>(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1_000,
    },
    body: {
      type: Schema.Types.Mixed,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2_048,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    authorImageUrl: {
      type: String,
      trim: true,
      maxlength: 2_048,
    },
    status: {
      type: String,
      enum: Object.values(BlogPostStatus),
      default: BlogPostStatus.DRAFT,
    },
    publishedAt: Date,
  },
  { timestamps: true, collection: 'blog_posts' },
);

blogPostSchema.index({ slug: 1 }, { unique: true });
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ status: 1, category: 1, publishedAt: -1 });
blogPostSchema.index({ title: 'text', excerpt: 'text' }, { weights: { title: 5, excerpt: 2 } });

export default mongoose.model<BlogPost>('BlogPost', blogPostSchema);

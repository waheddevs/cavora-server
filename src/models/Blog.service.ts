import { AppError } from '../common/errors/app-error';
import { ErrorCode, HttpCode } from '../common/errors/error-codes';
import { BlogCommentStatus, BlogPostStatus } from '../libs/enums/blog.enum';
import type {
  BlogComment,
  BlogCommentInput,
  BlogCommentInquiry,
  BlogCommentView,
  BlogPost,
  BlogPostInquiry,
  BlogPostSummaryView,
  BlogPostView,
  PaginatedBlogComments,
  PaginatedBlogPosts,
} from '../libs/types/blog';
import BlogCommentModel from '../schema/BlogComment.model';
import BlogPostModel from '../schema/BlogPost.model';

function postNotFound(): AppError {
  return new AppError(HttpCode.NOT_FOUND, ErrorCode.BLOG_POST_NOT_FOUND, 'Blog post not found.');
}

function toPostSummary(post: BlogPost, commentCount: number): BlogPostSummaryView {
  return {
    id: post._id.toString(),
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    imageUrl: post.imageUrl,
    authorName: post.authorName,
    ...(post.authorImageUrl ? { authorImageUrl: post.authorImageUrl } : {}),
    commentCount,
    publishedAt: (post.publishedAt as Date).toISOString(),
  };
}

function toCommentView(comment: BlogComment): BlogCommentView {
  return {
    id: comment._id.toString(),
    name: comment.name,
    body: comment.body,
    ...(comment.memberId ? { memberId: comment.memberId.toString() } : {}),
    createdAt: comment.createdAt.toISOString(),
  };
}

class BlogService {
  public constructor(private readonly now: () => Date = () => new Date()) {}

  public async getPosts(inquiry: BlogPostInquiry): Promise<PaginatedBlogPosts> {
    const filter = {
      status: BlogPostStatus.PUBLISHED,
      publishedAt: { $lte: this.now() },
      ...(inquiry.category ? { category: inquiry.category } : {}),
    };
    const [posts, total] = await Promise.all([
      BlogPostModel.find(filter)
        .sort({ publishedAt: -1, _id: -1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<BlogPost[]>()
        .exec(),
      BlogPostModel.countDocuments(filter).exec(),
    ]);
    const commentCounts = await Promise.all(
      posts.map((post) =>
        BlogCommentModel.countDocuments({
          postId: post._id,
          status: { $in: [BlogCommentStatus.APPROVED, BlogCommentStatus.PENDING] },
        }).exec(),
      ),
    );
    return {
      data: posts.map((post, index) => toPostSummary(post, commentCounts[index] ?? 0)),
      meta: {
        page: inquiry.page,
        limit: inquiry.limit,
        total,
        totalPages: Math.ceil(total / inquiry.limit),
      },
    };
  }

  public async getPost(slug: string): Promise<BlogPostView> {
    const post = await BlogPostModel.findOne({
      slug,
      status: BlogPostStatus.PUBLISHED,
      publishedAt: { $lte: this.now() },
    })
      .lean<BlogPost>()
      .exec();
    if (!post) throw postNotFound();
    const commentCount = await BlogCommentModel.countDocuments({
      postId: post._id,
      status: { $in: [BlogCommentStatus.APPROVED, BlogCommentStatus.PENDING] },
    }).exec();
    return {
      ...toPostSummary(post, commentCount),
      body: post.body,
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  public async getComments(inquiry: BlogCommentInquiry): Promise<PaginatedBlogComments> {
    const postExists = await BlogPostModel.exists({
      _id: inquiry.postId,
      status: BlogPostStatus.PUBLISHED,
      publishedAt: { $lte: this.now() },
    });
    if (!postExists) throw postNotFound();

    const filter = {
      postId: inquiry.postId,
      status: { $in: [BlogCommentStatus.APPROVED, BlogCommentStatus.PENDING] },
    };
    const [comments, total] = await Promise.all([
      BlogCommentModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<BlogComment[]>()
        .exec(),
      BlogCommentModel.countDocuments(filter).exec(),
    ]);
    return {
      data: comments.map(toCommentView),
      meta: {
        page: inquiry.page,
        limit: inquiry.limit,
        total,
        totalPages: Math.ceil(total / inquiry.limit),
      },
    };
  }

  public async submitComment(
    input: BlogCommentInput,
  ): Promise<{ id: string; message: string; status: BlogCommentStatus }> {
    const postExists = await BlogPostModel.exists({
      _id: input.postId,
      status: BlogPostStatus.PUBLISHED,
      publishedAt: { $lte: this.now() },
    });
    if (!postExists) throw postNotFound();

    const comment = await BlogCommentModel.create({
      ...input,
      status: BlogCommentStatus.APPROVED,
    });
    return {
      id: comment._id.toString(),
      status: BlogCommentStatus.APPROVED,
      message: 'Your comment has been posted.',
    };
  }
}

export default BlogService;

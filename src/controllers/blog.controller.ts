import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { HttpCode } from '../common/errors/error-codes';
import type { BlogCommentInput, BlogCommentInquiry, BlogPostInquiry } from '../libs/types/blog';
import BlogService from '../models/Blog.service';

const blogService = new BlogService();

const blogController = {
  async getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getPosts');
      const result = await blogService.getPosts(req.validated.query as BlogPostInquiry);
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on getPosts');
      next(err);
    }
  },

  async getPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getPost');
      const { slug } = req.validated.params as { slug: string };
      const result = await blogService.getPost(slug);
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getPost');
      next(err);
    }
  },

  async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getComments');
      const { id } = req.validated.params as { id: string };
      const query = req.validated.query as { limit: number; page: number };
      const inquiry: BlogCommentInquiry = {
        postId: new Types.ObjectId(id),
        ...query,
      };
      const result = await blogService.getComments(inquiry);
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on getComments');
      next(err);
    }
  },

  async submitComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('submitComment');
      const { id } = req.validated.params as { id: string };
      const input: BlogCommentInput = {
        ...(req.validated.body as Omit<BlogCommentInput, 'memberId' | 'postId'>),
        postId: new Types.ObjectId(id),
        ...(req.auth ? { memberId: req.auth.memberId } : {}),
      };
      const result = await blogService.submitComment(input);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.ACCEPTED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on submitComment');
      next(err);
    }
  },
};

export default blogController;

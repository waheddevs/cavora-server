import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';
import MemberService from '../../models/Member.service';

const memberService = new MemberService();

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieValue: unknown = req.cookies[env.SESSION_COOKIE_NAME];
    const sessionToken = typeof cookieValue === 'string' ? cookieValue : undefined;
    req.auth = await memberService.authenticateSession(sessionToken);
    next();
  } catch (err) {
    next(err);
  }
}

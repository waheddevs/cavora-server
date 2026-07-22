import { Member } from './member';

declare global {
  namespace Express {
    interface Request {
      member?: Member;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    member?: Member;
  }
}

export {};

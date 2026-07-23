import type { AuthContext } from '../../libs/types/member';

declare global {
  namespace Express {
    interface ValidatedRequestData {
      body: unknown;
      headers: unknown;
      params: unknown;
      query: unknown;
    }

    interface Request {
      auth?: AuthContext;
      requestId: string;
      validated: ValidatedRequestData;
    }
  }
}

export {};

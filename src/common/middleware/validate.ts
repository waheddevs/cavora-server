import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError, type FieldErrors } from '../errors/app-error';

export interface RequestSchemas {
  body?: ZodType;
  headers?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export function validate(schemas: RequestSchemas) {
  return async function validationMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const validated: Express.ValidatedRequestData = {
        body: req.body,
        headers: req.headers,
        params: req.params,
        query: req.query,
      };
      const fieldErrors: FieldErrors = {};

      for (const target of ['body', 'headers', 'params', 'query'] as const) {
        const schema = schemas[target];
        if (!schema) continue;

        const result = await schema.safeParseAsync(validated[target]);
        if (result.success) {
          validated[target] = result.data;
          continue;
        }

        for (const issue of result.error.issues) {
          const issuePath = issue.path.length > 0 ? issue.path.join('.') : 'request';
          const path = `${target}.${issuePath}`;
          fieldErrors[path] ??= issue.message;
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        throw AppError.validation(fieldErrors);
      }

      req.validated = validated;
      next();
    } catch (err) {
      next(err);
    }
  };
}

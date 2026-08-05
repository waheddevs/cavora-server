import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Request, RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { MemberRole } from '../../libs/enums/member.enum';
import type { AuthContext } from '../../libs/types/member';
import { AppError } from '../errors/app-error';
import { ErrorCode, HttpCode } from '../errors/error-codes';

/**
 * Uploaded files live under `src/uploads/<folder>/<file>` and are served at
 * `/uploads/<folder>/<file>`. The path is anchored to the project root so it
 * resolves identically from `src/` in development and `dist/` after a build.
 */
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

export const UPLOAD_ROOT = path.join(PROJECT_ROOT, 'src', 'uploads');
export const UPLOAD_ROUTE = '/uploads';

export const UPLOAD_FOLDERS = ['admin', 'user', 'tours', 'blog'] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];
type UploadFolderResolver = (req: Request) => UploadFolder;

const MAX_FILE_BYTES = 5 * 1_024 * 1_024;

const ALLOWED_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);
const persistedUploads = new WeakSet<Request>();

function invalidUpload(message: string): AppError {
  return new AppError(HttpCode.UNPROCESSABLE_ENTITY, ErrorCode.VALIDATION_ERROR, message);
}

function folderPath(folder: UploadFolder): string {
  return path.join(UPLOAD_ROOT, folder);
}

function ensureFolder(folder: UploadFolder): string {
  const target = folderPath(folder);
  if (!existsSync(target)) mkdirSync(target, { recursive: true });
  return target;
}

for (const folder of UPLOAD_FOLDERS) ensureFolder(folder);

function buildFileName(mimetype: string): string {
  const extension = ALLOWED_TYPES.get(mimetype) ?? '.bin';
  return `${Date.now()}-${randomBytes(8).toString('hex')}${extension}`;
}

function toUploadError(err: unknown): unknown {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return invalidUpload('Image must be 5 MB or smaller.');
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return invalidUpload('Unexpected file field.');
    return invalidUpload('The uploaded file could not be processed.');
  }
  return err;
}

/**
 * Public URL for a stored upload, e.g. `/uploads/user/1699-ab12.jpg`.
 */
export function uploadUrl(folder: UploadFolder, fileName: string): string {
  return `${UPLOAD_ROUTE}/${folder}/${fileName}`;
}

/**
 * Deletes a previously stored upload. Ignores URLs that are not local uploads
 * (e.g. externally hosted images) and files that are already gone.
 */
export async function removeUpload(url: string | undefined): Promise<void> {
  if (!url?.startsWith(`${UPLOAD_ROUTE}/`)) return;

  const relative = url.slice(UPLOAD_ROUTE.length + 1);
  const target = path.resolve(UPLOAD_ROOT, relative);
  const relativeTarget = path.relative(UPLOAD_ROOT, target);
  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) return;

  try {
    await unlink(target);
  } catch {
    // The file was already removed; nothing to clean up.
  }
}

/**
 * Marks the request's file as referenced by a successfully persisted record.
 */
export function markUploadPersisted(req: Request): void {
  persistedUploads.add(req);
}

/**
 * Returns the avatar directory for an authenticated account. Administrators and
 * regular members are deliberately kept in separate directories.
 */
export function accountUploadFolder(auth: Pick<AuthContext, 'role'>): UploadFolder {
  return auth.role === MemberRole.ADMIN ? 'admin' : 'user';
}

function authenticatedAccountFolder(req: Request): UploadFolder {
  if (!req.auth) {
    throw new AppError(
      HttpCode.UNAUTHORIZED,
      ErrorCode.AUTHENTICATION_REQUIRED,
      'Sign in required.',
    );
  }
  return accountUploadFolder(req.auth);
}

/**
 * Accepts a single account image and selects `admin` or `user` after auth.
 */
export function uploadAccountImage(field = 'image'): RequestHandler {
  return uploadImage(authenticatedAccountFolder, field);
}

/**
 * Accepts a single image for `<field>` and stores it in `src/uploads/<folder>/`.
 * On success `req.file` carries the stored file.
 */
export function uploadImage(
  folder: UploadFolder | UploadFolderResolver,
  field = 'image',
): RequestHandler {
  const handler = multer({
    limits: { fileSize: MAX_FILE_BYTES, files: 1 },
    storage: multer.diskStorage({
      destination(_req, _file, callback) {
        try {
          const resolvedFolder = typeof folder === 'function' ? folder(_req) : folder;
          callback(null, ensureFolder(resolvedFolder));
        } catch (err) {
          callback(err as Error, '');
        }
      },
      filename(_req, file, callback) {
        callback(null, buildFileName(file.mimetype));
      },
    }),
    fileFilter(_req, file, callback) {
      if (!ALLOWED_TYPES.has(file.mimetype)) {
        callback(invalidUpload('Image must be a JPG, PNG, WEBP, or AVIF file.'));
        return;
      }
      callback(null, true);
    },
  }).single(field);

  return (req, res, next) => {
    handler(req, res, (err: unknown) => {
      if (err) {
        next(toUploadError(err));
        return;
      }
      if (req.file) {
        const uploadedPath = req.file.path;
        res.once('finish', () => {
          if (res.statusCode < 400 || persistedUploads.has(req)) return;
          void unlink(uploadedPath).catch(() => undefined);
        });
      }
      next();
    });
  };
}

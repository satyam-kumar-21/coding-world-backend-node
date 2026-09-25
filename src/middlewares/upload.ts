import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AppError } from './errorHandler';
import { FILE_LIMITS } from '../constants';
import { HTTP_STATUS } from '../constants';

// Use memory storage — files are sent to S3/storage, never written to disk in prod
const memoryStorage = multer.memoryStorage();

function createFileFilter(allowedTypes: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `File type "${file.mimetype}" not allowed. Allowed: ${allowedTypes.join(', ')}`,
          HTTP_STATUS.BAD_REQUEST,
        ),
      );
    }
  };
}

// ─── Avatar / profile image ───────────────────────────────────────────────────
export const avatarUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: FILE_LIMITS.AVATAR_MAX_SIZE },
  fileFilter: createFileFilter([...FILE_LIMITS.ALLOWED_IMAGE_TYPES]),
});

// ─── Course thumbnail ─────────────────────────────────────────────────────────
export const thumbnailUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: FILE_LIMITS.THUMBNAIL_MAX_SIZE },
  fileFilter: createFileFilter([...FILE_LIMITS.ALLOWED_IMAGE_TYPES]),
});

// ─── Course / lecture documents ───────────────────────────────────────────────
export const documentUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: FILE_LIMITS.DOCUMENT_MAX_SIZE },
  fileFilter: createFileFilter([...FILE_LIMITS.ALLOWED_DOCUMENT_TYPES]),
});

// ─── Image upload (post media etc.) ──────────────────────────────────────────
export const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: FILE_LIMITS.THUMBNAIL_MAX_SIZE },
  fileFilter: createFileFilter([...FILE_LIMITS.ALLOWED_IMAGE_TYPES]),
});

// ─── Chat file ────────────────────────────────────────────────────────────────
export const chatFileUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: FILE_LIMITS.CHAT_FILE_MAX_SIZE },
  fileFilter: createFileFilter([
    ...FILE_LIMITS.ALLOWED_IMAGE_TYPES,
    ...FILE_LIMITS.ALLOWED_DOCUMENT_TYPES,
  ]),
});

// ─── General upload (multiple types) ─────────────────────────────────────────
export const generalUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: FILE_LIMITS.DOCUMENT_MAX_SIZE },
  fileFilter: createFileFilter([
    ...FILE_LIMITS.ALLOWED_IMAGE_TYPES,
    ...FILE_LIMITS.ALLOWED_DOCUMENT_TYPES,
  ]),
});

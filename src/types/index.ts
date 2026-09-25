import { Request } from 'express';
import { Role } from '@prisma/client';

// ─── Authenticated Request ────────────────────────────────────────────────────

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthPayload;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: Role;
  username: string;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: string;
  family: string;
  type: 'refresh';
}

export interface JwtEmailPayload {
  sub: string;
  email: string;
  type: 'email_verify';
}

export interface JwtPasswordResetPayload {
  sub: string;
  email: string;
  type: 'password_reset';
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationError[];
  meta?: PaginationMeta;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CursorPaginationQuery {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  hasNext: boolean;
  hasPrev: boolean;
  count: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  meta: CursorPaginationMeta;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface StorageUploadResult {
  key: string;
  url: string;
  bucket: string;
  etag?: string;
}

export interface StorageServiceInterface {
  upload(key: string, buffer: Buffer, mimeType: string, isPublic?: boolean): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  exists(key: string): Promise<boolean>;
}

// ─── Email ────────────────────────────────────────────────────────────────────

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailServiceInterface {
  send(options: EmailOptions): Promise<void>;
}

// ─── Socket ───────────────────────────────────────────────────────────────────

export interface SocketAuthPayload {
  userId: string;
  email: string;
  role: Role;
  username: string;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc';

export interface SearchQuery {
  q: string;
  page?: number;
  limit?: number;
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

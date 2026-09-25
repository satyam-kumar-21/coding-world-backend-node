import { PAGINATION } from '../constants';
import type {
  PaginationQuery,
  PaginationMeta,
  CursorPaginationQuery,
  CursorPaginationMeta,
  PaginatedResult,
  CursorPaginatedResult,
} from '../types';

// ─── Offset Pagination ────────────────────────────────────────────────────────

export function parsePaginationQuery(query: Record<string, unknown>): Required<PaginationQuery> {
  const page = Math.max(1, parseInt(String(query.page ?? PAGINATION.DEFAULT_PAGE)));
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(String(query.limit ?? PAGINATION.DEFAULT_LIMIT))),
  );
  const sortBy = String(query.sortBy ?? 'createdAt');
  const sortOrder = (query.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  return { page, limit, sortBy, sortOrder };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function getPrismaSkipTake(page: number, limit: number): { skip: number; take: number } {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ─── Cursor Pagination ────────────────────────────────────────────────────────

export function parseCursorQuery(query: Record<string, unknown>): CursorPaginationQuery {
  const cursor = query.cursor ? String(query.cursor) : undefined;
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(String(query.limit ?? PAGINATION.CURSOR_LIMIT))),
  );
  const direction = query.direction === 'backward' ? 'backward' : 'forward';
  return { cursor, limit, direction };
}

export function buildCursorPaginatedResult<T extends { id: string }>(
  items: T[],
  limit: number,
  direction: 'forward' | 'backward' = 'forward',
): CursorPaginatedResult<T> {
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;

  const nextCursor =
    direction === 'forward' && hasMore ? sliced[sliced.length - 1]?.id ?? null : null;
  const prevCursor =
    direction === 'backward' && hasMore ? sliced[0]?.id ?? null : null;

  return {
    items: sliced,
    meta: {
      nextCursor,
      prevCursor,
      hasNext: direction === 'forward' ? hasMore : false,
      hasPrev: direction === 'backward' ? hasMore : false,
      count: sliced.length,
    },
  };
}

export function buildPrismaCursorArgs(
  cursor?: string,
  limit = PAGINATION.CURSOR_LIMIT,
  direction: 'forward' | 'backward' = 'forward',
): {
  cursor?: { id: string };
  take: number;
  skip?: number;
  orderBy: { createdAt: 'asc' | 'desc' };
} {
  return {
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
    orderBy: { createdAt: direction === 'forward' ? 'desc' : 'asc' },
  };
}

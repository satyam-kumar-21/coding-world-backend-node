import {
  parsePaginationQuery,
  buildPaginationMeta,
  getPrismaSkipTake,
  buildPaginatedResult,
} from '../../../src/utils/pagination';

describe('Pagination Utils', () => {
  describe('parsePaginationQuery', () => {
    it('returns defaults when no query provided', () => {
      const result = parsePaginationQuery({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe('desc');
    });

    it('parses provided values', () => {
      const result = parsePaginationQuery({ page: '3', limit: '10' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
    });

    it('clamps limit to MAX_LIMIT', () => {
      const result = parsePaginationQuery({ limit: '999' });
      expect(result.limit).toBe(100);
    });

    it('clamps page to minimum 1', () => {
      const result = parsePaginationQuery({ page: '-5' });
      expect(result.page).toBe(1);
    });
  });

  describe('buildPaginationMeta', () => {
    it('calculates totalPages correctly', () => {
      const meta = buildPaginationMeta(100, 1, 20);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(false);
    });

    it('hasNext is false on last page', () => {
      const meta = buildPaginationMeta(40, 2, 20);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it('handles zero total', () => {
      const meta = buildPaginationMeta(0, 1, 20);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNext).toBe(false);
    });
  });

  describe('getPrismaSkipTake', () => {
    it('calculates skip correctly', () => {
      expect(getPrismaSkipTake(1, 20)).toEqual({ skip: 0, take: 20 });
      expect(getPrismaSkipTake(2, 20)).toEqual({ skip: 20, take: 20 });
      expect(getPrismaSkipTake(3, 10)).toEqual({ skip: 20, take: 10 });
    });
  });

  describe('buildPaginatedResult', () => {
    it('builds result with items and meta', () => {
      const items = [1, 2, 3];
      const result = buildPaginatedResult(items, 50, 2, 10);
      expect(result.items).toEqual(items);
      expect(result.meta.total).toBe(50);
      expect(result.meta.page).toBe(2);
    });
  });
});

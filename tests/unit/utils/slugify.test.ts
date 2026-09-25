import { slugify, slugifyUnique, generateUsername } from '../../../src/utils/slugify';

describe('Slugify Utils', () => {
  describe('slugify', () => {
    it('converts to lowercase with hyphens', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
    });

    it('collapses multiple hyphens', () => {
      expect(slugify('hello---world')).toBe('hello-world');
    });

    it('trims leading/trailing hyphens', () => {
      expect(slugify('-hello world-')).toBe('hello-world');
    });

    it('handles empty string', () => {
      expect(slugify('')).toBe('');
    });
  });

  describe('slugifyUnique', () => {
    it('adds hex suffix', () => {
      const slug = slugifyUnique('My Course');
      expect(slug).toMatch(/^my-course-[a-f0-9]+$/);
    });

    it('generates unique slugs for same input', () => {
      const s1 = slugifyUnique('same title');
      const s2 = slugifyUnique('same title');
      expect(s1).not.toBe(s2);
    });
  });

  describe('generateUsername', () => {
    it('generates username from email', () => {
      const username = generateUsername('john.doe@example.com');
      expect(username).toMatch(/^johndoe[a-f0-9]+$/);
    });

    it('handles special chars in email local part', () => {
      const username = generateUsername('user+tag@example.com');
      expect(username).toMatch(/^usertag[a-f0-9]+$/);
    });
  });
});

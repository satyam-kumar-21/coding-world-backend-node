import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  createHmacSignature,
  verifyHmacSignature,
  verifyRazorpaySignature,
  generateOrderNumber,
  generateCertificateNumber,
  generateRoomCode,
} from '../../../src/utils/crypto';

describe('Crypto Utils', () => {
  describe('hashPassword / verifyPassword', () => {
    it('hashes and verifies a password', async () => {
      const password = 'TestPassword@123';
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(await verifyPassword(hash, password)).toBe(true);
    });

    it('returns false for wrong password', async () => {
      const hash = await hashPassword('CorrectPassword@1');
      expect(await verifyPassword(hash, 'WrongPassword@1')).toBe(false);
    });

    it('generates different hashes for same password', async () => {
      const h1 = await hashPassword('SamePassword@1');
      const h2 = await hashPassword('SamePassword@1');
      expect(h1).not.toBe(h2);
    });
  });

  describe('generateSecureToken', () => {
    it('generates a hex string of correct length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('generates unique tokens', () => {
      const t1 = generateSecureToken();
      const t2 = generateSecureToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('HMAC signatures', () => {
    const secret = 'test-secret-key';
    const payload = 'test-payload-data';

    it('creates and verifies a valid signature', () => {
      const sig = createHmacSignature(payload, secret);
      expect(verifyHmacSignature(payload, secret, sig)).toBe(true);
    });

    it('rejects tampered payload', () => {
      const sig = createHmacSignature(payload, secret);
      expect(verifyHmacSignature('tampered-payload', secret, sig)).toBe(false);
    });

    it('rejects wrong secret', () => {
      const sig = createHmacSignature(payload, secret);
      expect(verifyHmacSignature(payload, 'wrong-secret', sig)).toBe(false);
    });
  });

  describe('verifyRazorpaySignature', () => {
    it('verifies correct Razorpay signature', () => {
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      const secret = 'rzp_secret';
      const { createHmacSignature } = require('../../../src/utils/crypto');
      const sig = createHmacSignature(`${orderId}|${paymentId}`, secret);
      expect(verifyRazorpaySignature(orderId, paymentId, sig, secret)).toBe(true);
    });
  });

  describe('generators', () => {
    it('generateOrderNumber returns CW- prefixed string', () => {
      expect(generateOrderNumber()).toMatch(/^CW-/);
    });

    it('generateCertificateNumber returns year-prefixed string', () => {
      const year = new Date().getFullYear();
      expect(generateCertificateNumber()).toContain(year.toString());
    });

    it('generateRoomCode returns 12-char uppercase hex', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(12);
      expect(code).toMatch(/^[A-F0-9]+$/);
    });
  });
});

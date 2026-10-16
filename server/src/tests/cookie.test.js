/**
 * Unit tests for Production Cookie Configuration
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSameSite,
  isSecureCookie,
  getCookieMaxAge,
  getBaseCookieOptions,
  getAuthCookieOptions,
  getCsrfCookieOptions,
  getClearCookieOptions
} from '../config/cookie.js';

describe('Production Cookie Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getSameSite', () => {
    it('defaults to lax if not set or invalid', () => {
      delete process.env.COOKIE_SAME_SITE;
      expect(getSameSite()).toBe('lax');

      process.env.COOKIE_SAME_SITE = 'invalid_value';
      expect(getSameSite()).toBe('lax');
    });

    it('normalizes valid sameSite values (lax, strict, none)', () => {
      process.env.COOKIE_SAME_SITE = 'STRICT';
      expect(getSameSite()).toBe('strict');

      process.env.COOKIE_SAME_SITE = 'none ';
      expect(getSameSite()).toBe('none');

      process.env.COOKIE_SAME_SITE = 'lax';
      expect(getSameSite()).toBe('lax');
    });
  });

  describe('isSecureCookie', () => {
    it('returns true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_SECURE;
      delete process.env.COOKIE_SAME_SITE;
      expect(isSecureCookie()).toBe(true);
    });

    it('returns true when sameSite is none (browser requirement)', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_SAME_SITE = 'none';
      delete process.env.COOKIE_SECURE;
      expect(isSecureCookie()).toBe(true);
    });

    it('respects explicit COOKIE_SECURE override', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_SECURE = 'true';
      expect(isSecureCookie()).toBe(true);

      process.env.COOKIE_SECURE = 'false';
      process.env.COOKIE_SAME_SITE = 'lax';
      expect(isSecureCookie()).toBe(false);
    });
  });

  describe('getCookieMaxAge', () => {
    it('defaults to 8 hours in ms (28,800,000)', () => {
      delete process.env.COOKIE_MAX_AGE_MS;
      delete process.env.COOKIE_MAX_AGE;
      expect(getCookieMaxAge()).toBe(8 * 60 * 60 * 1000);
    });

    it('allows custom maxAge via COOKIE_MAX_AGE_MS', () => {
      process.env.COOKIE_MAX_AGE_MS = '3600000'; // 1 hour
      expect(getCookieMaxAge()).toBe(3600000);
    });

    it('falls back to default if invalid number provided', () => {
      process.env.COOKIE_MAX_AGE_MS = 'not-a-number';
      expect(getCookieMaxAge()).toBe(28800000);
    });
  });

  describe('getAuthCookieOptions', () => {
    it('enforces httpOnly: true, path: /, and explicit maxAge', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SAME_SITE = 'lax';

      const options = getAuthCookieOptions();
      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(28800000);
    });

    it('forces secure: true if sameSite is none even if COOKIE_SECURE was false', () => {
      process.env.COOKIE_SAME_SITE = 'none';
      process.env.COOKIE_SECURE = 'false';

      const options = getAuthCookieOptions();
      expect(options.sameSite).toBe('none');
      expect(options.secure).toBe(true);
    });

    it('includes domain if COOKIE_DOMAIN is set', () => {
      process.env.COOKIE_DOMAIN = '.fusheng.com.vn';
      const options = getAuthCookieOptions();
      expect(options.domain).toBe('.fusheng.com.vn');
    });
  });

  describe('getCsrfCookieOptions & getClearCookieOptions', () => {
    it('sets httpOnly correctly for CSRF cookies', () => {
      expect(getCsrfCookieOptions(true).httpOnly).toBe(true);
      expect(getCsrfCookieOptions(false).httpOnly).toBe(false);
      expect(getCsrfCookieOptions(true).path).toBe('/');
    });

    it('getClearCookieOptions provides matching parameters without maxAge', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SAME_SITE = 'lax';

      const clearOptions = getClearCookieOptions(true);
      expect(clearOptions.httpOnly).toBe(true);
      expect(clearOptions.secure).toBe(true);
      expect(clearOptions.sameSite).toBe('lax');
      expect(clearOptions.path).toBe('/');
      expect(clearOptions.maxAge).toBeUndefined();
    });
  });
});

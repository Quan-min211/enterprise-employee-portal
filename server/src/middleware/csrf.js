import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'fusheng-csrf-secret-key-2026';

/**
 * Generate cryptographically secure HMAC-signed CSRF token
 * Structure: `${randomHex}.${hmacSignature}`
 */
export const generateCsrfToken = () => {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const hmac = crypto.createHmac('sha256', CSRF_SECRET).update(randomBytes).digest('hex');
  return `${randomBytes}.${hmac}`;
};

/**
 * Verify HMAC signature of a CSRF token to prevent tampering
 */
export const verifyCsrfTokenSignature = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [randomBytes, signature] = parts;
  if (!randomBytes || !signature) return false;

  const expectedHmac = crypto.createHmac('sha256', CSRF_SECRET).update(randomBytes).digest('hex');
  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedHmac, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
};

export { getCsrfCookieOptions } from '../config/cookie.js';
import { getCsrfCookieOptions, getClearCookieOptions } from '../config/cookie.js';

/**
 * Set both HttpOnly cookie (_csrf) for strict server validation
 * and non-HttpOnly cookie (XSRF-TOKEN) for same-domain client reading (Axios)
 */
export const setCsrfCookies = (res, token) => {
  res.cookie('_csrf', token, getCsrfCookieOptions(true));
  res.cookie('XSRF-TOKEN', token, getCsrfCookieOptions(false));
};

/**
 * Clear CSRF cookies on logout
 */
export const clearCsrfCookies = (res) => {
  res.clearCookie('_csrf', getClearCookieOptions(true));
  res.clearCookie('XSRF-TOKEN', getClearCookieOptions(false));
};


/**
 * CSRF Protection Middleware
 * Protects state-changing requests (POST, PUT, PATCH, DELETE) for cookie-based authentication
 * Supports Double-Submit Cookie (same-domain) and Header-Cookie verification (cross-domain)
 */
export const csrfProtection = (req, res, next) => {
  // 1. Safe HTTP methods do not change state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 2. Skip in automated test environment unless explicitly opted in
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-csrf']) {
    return next();
  }

  // 3. Skip login route — user does not have an active session yet
  const urlPath = req.originalUrl || req.path || '';
  if (urlPath.includes('/api/auth/login')) {
    return next();
  }

  const hasAuthCookie = Boolean(req.cookies?.token);
  const cookieCsrfToken = req.cookies?._csrf || req.cookies?.['XSRF-TOKEN'] || req.cookies?.csrf_token;

  // 4. If request is not authenticated via cookie and has no CSRF cookie:
  // If Bearer token authorization header is used, it is immune to CSRF
  if (!hasAuthCookie && !cookieCsrfToken) {
    return next();
  }

  // 5. If user has auth cookie but no CSRF cookie, session is missing CSRF state
  if (hasAuthCookie && !cookieCsrfToken) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'Thiếu cookie CSRF trong phiên làm việc. Vui lòng đăng nhập lại.'
    });
  }

  // 6. Check header token
  const headerCsrfToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

  if (!headerCsrfToken) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'Thiếu CSRF token trong request header. Vui lòng tải lại trang hoặc đăng nhập lại.'
    });
  }

  // 7. Verify HMAC signature of header token
  if (!verifyCsrfTokenSignature(headerCsrfToken)) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'CSRF token không hợp lệ hoặc đã bị thay đổi.'
    });
  }

  // 8. Double Submit verification: compare header token with cookie token
  if (cookieCsrfToken) {
    const headerBuf = Buffer.from(headerCsrfToken, 'utf8');
    const cookieBuf = Buffer.from(cookieCsrfToken, 'utf8');

    if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
      return res.status(403).json({
        success: false,
        code: 'CSRF_INVALID',
        message: 'CSRF token không khớp với phiên làm việc.'
      });
    }
  }

  next();
};

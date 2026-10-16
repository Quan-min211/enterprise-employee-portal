/**
 * Cookie configuration for Production and Development environments
 * Standardizes:
 * - httpOnly: true (prevents XSS access to sensitive tokens)
 * - secure: true (transmits cookies over HTTPS only)
 * - sameSite: 'lax' | 'none' | 'strict' (based on deployment model)
 * - maxAge: explicit lifetime in milliseconds
 * - path: '/' (consistent scope across all API routes)
 */

const VALID_SAME_SITE = ['lax', 'strict', 'none'];

/**
 * Resolve and validate SameSite policy
 */
export const getSameSite = () => {
  const envVal = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase().trim();
  return VALID_SAME_SITE.includes(envVal) ? envVal : 'lax';
};

/**
 * Determine if cookie must have secure flag
 * Browsers REQUIRE secure: true when sameSite: 'none'
 */
export const isSecureCookie = () => {
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === 'true' || process.env.COOKIE_SECURE === '1';
  }
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = getSameSite();
  return isProd || sameSite === 'none';
};

/**
 * Get cookie maxAge in milliseconds (default: 8 hours = 28,800,000 ms)
 */
export const getCookieMaxAge = () => {
  const parsed = parseInt(process.env.COOKIE_MAX_AGE_MS || process.env.COOKIE_MAX_AGE, 10);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return parsed;
  }
  // Default: 8 hours (matches JWT_EXPIRES_IN default)
  return 8 * 60 * 60 * 1000;
};

/**
 * Base cookie options
 */
export const getBaseCookieOptions = () => {
  const sameSite = getSameSite();
  let secure = isSecureCookie();

  // Enforce secure if sameSite is none (browser requirement)
  if (sameSite === 'none') {
    secure = true;
  }

  const options = {
    secure,
    sameSite,
    path: '/'
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN.trim();
  }

  return options;
};

/**
 * Options for the HttpOnly JWT authentication cookie
 */
export const getAuthCookieOptions = () => {
  return {
    ...getBaseCookieOptions(),
    httpOnly: true,
    maxAge: getCookieMaxAge()
  };
};

/**
 * Options for CSRF cookies
 * @param {boolean} httpOnly - true for server-only _csrf, false for client-readable XSRF-TOKEN
 */
export const getCsrfCookieOptions = (httpOnly = true) => {
  return {
    ...getBaseCookieOptions(),
    httpOnly,
    maxAge: getCookieMaxAge()
  };
};

/**
 * Options for clearing cookies on logout
 * Must match domain, path, secure, and sameSite of original cookie for reliable browser deletion
 */
export const getClearCookieOptions = (httpOnly = true) => {
  return {
    ...getBaseCookieOptions(),
    httpOnly
  };
};

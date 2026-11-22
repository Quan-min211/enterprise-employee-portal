/**
 * CORS Strict Origin Allowlist Security Tests (SEC-01)
 *
 * Verifies that:
 * 1. Exact configured origins (even with trailing slashes in env) are allowed.
 * 2. Arbitrary third-party *.vercel.app origins are strictly blocked even when
 *    CLIENT_URL contains a vercel.app domain (prevents cross-tenant credentialed CORS bypass).
 * 3. Wildcard '*' in CLIENT_URL is ignored so credentials: true never reflects arbitrary origins.
 * 4. Requests without an Origin header (curl / server-to-server) remain permitted.
 * 5. Blocked browser origins receive HTTP 403 CORS_BLOCKED on live Express middleware.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app, { isOriginAllowed, parseAllowedOrigins } from '../../server.js';

describe('CORS Origin Allowlist (SEC-01)', () => {
  it('normalizes comma-separated origins and strips trailing slashes and "*"', () => {
    const origins = parseAllowedOrigins(
      'https://enterprise-employee-portal.vercel.app/, http://localhost:5173 , * '
    );
    expect(origins).toEqual([
      'https://enterprise-employee-portal.vercel.app',
      'http://localhost:5173'
    ]);
  });

  it('allows exact configured origins and requests with no origin', () => {
    const allowed = ['https://enterprise-employee-portal.vercel.app', 'http://localhost:5173'];

    expect(isOriginAllowed(undefined, allowed)).toBe(true);
    expect(isOriginAllowed('https://enterprise-employee-portal.vercel.app', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
  });

  it('blocks arbitrary attacker *.vercel.app subdomains even when a vercel.app origin is configured', () => {
    const allowed = ['https://enterprise-employee-portal.vercel.app'];

    expect(isOriginAllowed('https://evil-phishing.vercel.app', allowed)).toBe(false);
    expect(isOriginAllowed('https://enterprise-employee-portal-evil.vercel.app', allowed)).toBe(false);
    expect(isOriginAllowed('http://enterprise-employee-portal.vercel.app', allowed)).toBe(false);
  });

  it('returns 403 CORS_BLOCKED for disallowed browser origins on the Express app', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil-attacker.vercel.app');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CORS_BLOCKED');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets Access-Control-Allow-Origin and Allow-Credentials for allowed origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});

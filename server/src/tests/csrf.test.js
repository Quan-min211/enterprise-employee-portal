/**
 * Unit & Integration tests for CSRF Protection
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User } from '../models/index.js';
import {
  generateCsrfToken,
  verifyCsrfTokenSignature
} from '../middleware/csrf.js';

let testDept = null;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testDept = await Department.create({
    code: 'CSRF_DEPT',
    name: 'CSRF Dept',
    description: 'Testing CSRF'
  });

  await User.create({
    employee_code: 'CSRF-001',
    full_name: 'CSRF Test User',
    email: 'csrf.user@fusheng.com.vn',
    password: await bcrypt.hash('TestPass@123', 10),
    role: 'admin',
    position: 'Security Tester',
    department_id: testDept.id,
    status: 'active'
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('CSRF Token Utility Functions', () => {
  it('generateCsrfToken produces a valid HMAC-signed token', () => {
    const token = generateCsrfToken();
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const [randomPart, sigPart] = token.split('.');
    expect(randomPart.length).toBe(64); // 32 bytes hex
    expect(sigPart.length).toBe(64); // sha256 hex
    expect(verifyCsrfTokenSignature(token)).toBe(true);
  });

  it('verifyCsrfTokenSignature rejects invalid or tampered tokens', () => {
    expect(verifyCsrfTokenSignature('')).toBe(false);
    expect(verifyCsrfTokenSignature(null)).toBe(false);
    expect(verifyCsrfTokenSignature('not-a-token')).toBe(false);
    expect(verifyCsrfTokenSignature('fakeRandom.fakeSignature')).toBe(false);

    const validToken = generateCsrfToken();
    const [randomPart, sigPart] = validToken.split('.');

    // Tampered random part
    const tamperedRandom = 'a' + randomPart.slice(1);
    expect(verifyCsrfTokenSignature(`${tamperedRandom}.${sigPart}`)).toBe(false);

    // Tampered signature
    const tamperedSig = 'b' + sigPart.slice(1);
    expect(verifyCsrfTokenSignature(`${randomPart}.${tamperedSig}`)).toBe(false);
  });
});

describe('CSRF Endpoints and Middleware Integration', () => {
  it('GET /api/auth/csrf-token returns token and sets cookies', async () => {
    const res = await request(app).get('/api/auth/csrf-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.csrfToken).toBeDefined();
    expect(verifyCsrfTokenSignature(res.body.csrfToken)).toBe(true);

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();

    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieStr).toContain('_csrf=');
    expect(cookieStr).toContain('XSRF-TOKEN=');
  });

  it('POST /api/auth/login issues CSRF token and sets cookies', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'csrf.user@fusheng.com.vn', password: 'TestPass@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.csrfToken).toBeDefined();
    expect(verifyCsrfTokenSignature(res.body.csrfToken)).toBe(true);

    const setCookie = res.headers['set-cookie'];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieStr).toContain('token=');
    expect(cookieStr).toContain('_csrf=');
    expect(cookieStr).toContain('XSRF-TOKEN=');
  });

  it('rejects state-changing request if authenticated with cookie but CSRF header is missing', async () => {
    // Login to obtain cookies
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'csrf.user@fusheng.com.vn', password: 'TestPass@123' });

    const cookies = loginRes.headers['set-cookie'];

    // Send POST /api/auth/logout with x-test-csrf enforcement enabled
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .set('x-test-csrf', 'true');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('CSRF');
  });

  it('rejects state-changing request if CSRF header does not match cookie', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'csrf.user@fusheng.com.vn', password: 'TestPass@123' });

    const cookies = loginRes.headers['set-cookie'];
    const forgedToken = generateCsrfToken(); // Valid signature, but different from cookie

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .set('x-test-csrf', 'true')
      .set('X-CSRF-Token', forgedToken);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('không khớp');
  });

  it('rejects state-changing request if CSRF header signature is invalid', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'csrf.user@fusheng.com.vn', password: 'TestPass@123' });

    const cookies = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .set('x-test-csrf', 'true')
      .set('X-CSRF-Token', 'malicious-forged-token-12345');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('không hợp lệ');
  });

  it('accepts state-changing request when valid matching CSRF token is provided via X-CSRF-Token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'csrf.user@fusheng.com.vn', password: 'TestPass@123' });

    const cookies = loginRes.headers['set-cookie'];
    const csrfToken = loginRes.body.csrfToken;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .set('x-test-csrf', 'true')
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('thành công');
  });

  it('accepts state-changing request when valid matching CSRF token is provided via X-XSRF-TOKEN', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'csrf.user@fusheng.com.vn', password: 'TestPass@123' });

    const cookies = loginRes.headers['set-cookie'];
    const csrfToken = loginRes.body.csrfToken;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .set('x-test-csrf', 'true')
      .set('X-XSRF-TOKEN', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

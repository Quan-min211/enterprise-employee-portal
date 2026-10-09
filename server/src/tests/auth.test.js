/**
 * Smoke tests — Auth endpoints
 * These tests require a running MySQL database (local dev or CI service).
 * They use supertest to hit the Express app directly without a real HTTP port.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { startServer } from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User } from '../models/index.js';

let testUser = null;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Create a test department
  const dept = await Department.create({
    code: 'TEST',
    name: 'Test Department',
    description: 'Test'
  });

  // Create a test admin user
  testUser = await User.create({
    employee_code: 'TEST-001',
    full_name: 'Test Admin',
    email: 'admin.test@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    position: 'Test Admin',
    department_id: dept.id,
    status: 'active'
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Health check', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 and sets cookie on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.test@fusheng.com.vn', password: 'Admin@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.test@fusheng.com.vn', password: 'WrongPass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 on non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@fusheng.com.vn', password: 'Admin@123' });

    expect(res.status).toBe(401);
  });

  it('returns 400 on missing email/password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '' });

    expect(res.status).toBe(400);
  });

  it('blocks inactive user', async () => {
    await User.update({ status: 'inactive' }, { where: { id: testUser.id } });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.test@fusheng.com.vn', password: 'Admin@123' });

    expect(res.status).toBe(401);

    // Restore
    await User.update({ status: 'active' }, { where: { id: testUser.id } });
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user data with valid cookie', async () => {
    // First login to get cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.test@fusheng.com.vn', password: 'Admin@123' });

    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers['set-cookie'];
    expect(cookie).toBeDefined();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('admin.test@fusheng.com.vn');
    expect(res.body.user.password).toBeUndefined();
  });
});

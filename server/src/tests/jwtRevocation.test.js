/**
 * JWT Revocation & Session Freshness Security Tests (SEC-04)
 *
 * Verifies that:
 * 1. Logging out increments token_version so replaying the old cookie/Bearer JWT returns 401 TOKEN_REVOKED.
 * 2. Deactivating an account immediately revokes its active JWTs (401 TOKEN_REVOKED).
 * 3. Changing a user's role or resetting password revokes previously issued JWTs.
 * 4. Changing own password revokes older sessions while keeping the newly issued cookie valid.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User } from '../models/index.js';

let dept = null;
let adminCookie = null;

const extractTokenCookieValue = (setCookieHeaders) => {
  if (!Array.isArray(setCookieHeaders)) return '';
  const tokenLine = setCookieHeaders.find((c) => c.startsWith('token='));
  return tokenLine ? tokenLine.split(';')[0] : '';
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  dept = await Department.create({
    code: 'SEC-JWT',
    name: 'Phong Bao Mat',
    description: 'Testing JWT revocation'
  });

  await User.create({
    employee_code: 'ADM-JWT-01',
    full_name: 'Admin JWT Tester',
    email: 'admin.jwt@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    department_id: dept.id,
    status: 'active'
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin.jwt@fusheng.com.vn', password: 'Admin@123' });

  adminCookie = extractTokenCookieValue(adminLogin.headers['set-cookie']);
});

describe('JWT Revocation via token_version (SEC-04)', () => {
  it('revokes JWT immediately on logout so replaying the old token fails with 401 TOKEN_REVOKED', async () => {
    const emp = await User.create({
      employee_code: 'EMP-JWT-01',
      full_name: 'Logout Test User',
      email: 'logout.jwt@fusheng.com.vn',
      password: await bcrypt.hash('ValidPass@123', 10),
      role: 'employee',
      department_id: dept.id,
      status: 'active'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: emp.email, password: 'ValidPass@123' });

    const stolenCookie = extractTokenCookieValue(loginRes.headers['set-cookie']);
    const stolenJwt = stolenCookie.replace('token=', '');

    // Works before logout
    const beforeRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${stolenJwt}`);
    expect(beforeRes.status).toBe(200);

    // Logout increments token_version
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', stolenCookie);
    expect(logoutRes.status).toBe(200);

    // Replaying old JWT via Authorization header or Cookie is rejected
    const replayBearer = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${stolenJwt}`);
    expect(replayBearer.status).toBe(401);
    expect(replayBearer.body.code).toBe('TOKEN_REVOKED');

    const replayCookie = await request(app)
      .get('/api/employees')
      .set('Cookie', stolenCookie);
    expect(replayCookie.status).toBe(401);
    expect(replayCookie.body.code).toBe('TOKEN_REVOKED');
  });

  it('revokes active JWT immediately when admin deactivates the employee', async () => {
    const emp = await User.create({
      employee_code: 'EMP-JWT-02',
      full_name: 'Deactivate Test User',
      email: 'deact.jwt@fusheng.com.vn',
      password: await bcrypt.hash('ValidPass@123', 10),
      role: 'employee',
      department_id: dept.id,
      status: 'active'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: emp.email, password: 'ValidPass@123' });
    const empCookie = extractTokenCookieValue(loginRes.headers['set-cookie']);

    // Admin deactivates employee
    const deactRes = await request(app)
      .delete(`/api/employees/${emp.id}`)
      .set('Cookie', adminCookie);
    expect(deactRes.status).toBe(200);

    // Employee's previously valid JWT is immediately rejected
    const afterRes = await request(app)
      .get('/api/employees')
      .set('Cookie', empCookie);
    expect(afterRes.status).toBe(401);
    expect(afterRes.body.code).toBe('TOKEN_REVOKED');
  });

  it('revokes active JWT when admin changes user role', async () => {
    const mgr = await User.create({
      employee_code: 'MGR-JWT-01',
      full_name: 'Demoted Manager',
      email: 'demote.jwt@fusheng.com.vn',
      password: await bcrypt.hash('ValidPass@123', 10),
      role: 'manager',
      department_id: dept.id,
      status: 'active'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: mgr.email, password: 'ValidPass@123' });
    const oldMgrCookie = extractTokenCookieValue(loginRes.headers['set-cookie']);

    // Admin demotes manager to employee
    const updateRes = await request(app)
      .put(`/api/employees/${mgr.id}`)
      .set('Cookie', adminCookie)
      .send({ role: 'employee' });
    expect(updateRes.status).toBe(200);

    // Old manager JWT is revoked
    const afterRes = await request(app)
      .get('/api/leaves')
      .set('Cookie', oldMgrCookie);
    expect(afterRes.status).toBe(401);
    expect(afterRes.body.code).toBe('TOKEN_REVOKED');
  });

  it('revokes older device sessions when user changes password while keeping new cookie valid', async () => {
    const emp = await User.create({
      employee_code: 'EMP-JWT-03',
      full_name: 'Password Change Session User',
      email: 'pwd.jwt@fusheng.com.vn',
      password: await bcrypt.hash('OldSecret@123', 10),
      role: 'employee',
      department_id: dept.id,
      status: 'active'
    });

    // Device 1 logs in
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: emp.email, password: 'OldSecret@123' });
    const device1Cookie = extractTokenCookieValue(login1.headers['set-cookie']);

    // Device 2 logs in and changes password
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: emp.email, password: 'OldSecret@123' });
    const device2Cookie = extractTokenCookieValue(login2.headers['set-cookie']);

    const changeRes = await request(app)
      .put('/api/employees/me/password')
      .set('Cookie', device2Cookie)
      .send({
        current_password: 'OldSecret@123',
        new_password: 'NewSecret@456'
      });
    expect(changeRes.status).toBe(200);

    const device2NewCookie = extractTokenCookieValue(changeRes.headers['set-cookie']);

    // Device 1 old token must be revoked
    const device1Check = await request(app)
      .get('/api/employees')
      .set('Cookie', device1Cookie);
    expect(device1Check.status).toBe(401);
    expect(device1Check.body.code).toBe('TOKEN_REVOKED');

    // Device 2 newly re-issued cookie remains valid
    const device2Check = await request(app)
      .get('/api/employees')
      .set('Cookie', device2NewCookie);
    expect(device2Check.status).toBe(200);
  });
});

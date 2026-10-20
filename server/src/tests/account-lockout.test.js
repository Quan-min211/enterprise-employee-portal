/**
 * Integration tests for temporary account lockout by user/email
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User } from '../models/index.js';

let adminCookie = null;
let testDept = null;
let victimUser = null;

const victimEmail = 'lockout.target@fusheng.com.vn';
const victimPassword = 'CorrectPassword@2026';

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testDept = await Department.create({
    code: 'SEC_DEPT',
    name: 'Security Department',
    description: 'Testing Account Lockout'
  });

  // Admin user
  await User.create({
    employee_code: 'ADM-SEC-01',
    full_name: 'Security Admin',
    email: 'admin.sec@fusheng.com.vn',
    password: await bcrypt.hash('AdminPass@2026', 10),
    role: 'admin',
    position: 'Security Lead',
    department_id: testDept.id,
    status: 'active'
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin.sec@fusheng.com.vn', password: 'AdminPass@2026' });

  adminCookie = adminLogin.headers['set-cookie'];

  // Target employee user
  victimUser = await User.create({
    employee_code: 'EMP-LOCK-01',
    full_name: 'Lockout Target',
    email: victimEmail,
    password: await bcrypt.hash(victimPassword, 10),
    role: 'employee',
    position: 'Staff',
    department_id: testDept.id,
    status: 'active',
    failed_login_attempts: 0,
    locked_until: null
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Temporary Account Lockout by User/Email', () => {
  it('increments failed attempts on wrong password and returns remaining count', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: victimEmail, password: 'WrongPassword@1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Con 4 lan thu');

    const user = await User.findByPk(victimUser.id);
    expect(user.failed_login_attempts).toBe(1);
    expect(user.locked_until).toBeNull();
  });

  it('locks the account after 5 consecutive failed attempts with HTTP 423', async () => {
    // Attempt 2, 3, 4
    for (let i = 2; i <= 4; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: victimEmail, password: `WrongPassword@${i}` });
      expect(res.status).toBe(401);
    }

    // Attempt 5 -> triggers lockout
    const fifthRes = await request(app)
      .post('/api/auth/login')
      .send({ email: victimEmail, password: 'WrongPassword@5' });

    expect(fifthRes.status).toBe(423);
    expect(fifthRes.body.success).toBe(false);
    expect(fifthRes.body.locked).toBe(true);
    expect(fifthRes.body.message).toContain('khoa');

    const lockedUser = await User.findByPk(victimUser.id);
    expect(lockedUser.failed_login_attempts).toBe(5);
    expect(lockedUser.locked_until).not.toBeNull();
  });

  it('blocks login even with the CORRECT password while account is locked', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: victimEmail, password: victimPassword });

    expect(res.status).toBe(423);
    expect(res.body.success).toBe(false);
    expect(res.body.locked).toBe(true);
    expect(res.body.message).toContain('tam thoi bi khoa');
  });

  it('admin can unlock the locked account via updateEmployee with unlock: true', async () => {
    const unlockRes = await request(app)
      .put(`/api/employees/${victimUser.id}`)
      .set('Cookie', adminCookie)
      .send({ unlock: true });

    expect(unlockRes.status).toBe(200);

    const unlockedUser = await User.findByPk(victimUser.id);
    expect(unlockedUser.failed_login_attempts).toBe(0);
    expect(unlockedUser.locked_until).toBeNull();

    // User can now log in successfully with correct password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: victimEmail, password: victimPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });

  it('successful login resets failed attempts back to 0', async () => {
    // Make 2 wrong attempts
    await request(app)
      .post('/api/auth/login')
      .send({ email: victimEmail, password: 'WrongPassword@1' });
    await request(app)
      .post('/api/auth/login')
      .send({ email: victimEmail, password: 'WrongPassword@2' });

    let user = await User.findByPk(victimUser.id);
    expect(user.failed_login_attempts).toBe(2);

    // Now log in correctly
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: victimEmail, password: victimPassword });

    expect(loginRes.status).toBe(200);

    user = await User.findByPk(victimUser.id);
    expect(user.failed_login_attempts).toBe(0);
    expect(user.locked_until).toBeNull();
  });

  it('automatically unlocks after the lockout duration has elapsed', async () => {
    // Set locked_until in the past
    await User.update(
      {
        failed_login_attempts: 5,
        locked_until: new Date(Date.now() - 60 * 1000) // 1 minute ago
      },
      { where: { id: victimUser.id } }
    );

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: victimEmail, password: victimPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);

    const user = await User.findByPk(victimUser.id);
    expect(user.failed_login_attempts).toBe(0);
    expect(user.locked_until).toBeNull();
  });
});

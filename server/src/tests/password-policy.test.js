/**
 * Unit & Integration tests for Password Policy
 * - Min length: 8 - 128 chars
 * - Requires uppercase, lowercase, digit, special character
 * - Prohibits default system passwords (Admin@123, Employee@123, etc.)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User } from '../models/index.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';

describe('Password Policy Unit Tests', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePasswordPolicy('Ab1!xyz');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('8 đến 128 ký tự');
  });

  it('rejects passwords without uppercase letters', () => {
    const result = validatePasswordPolicy('lowercase@123');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('in hoa');
  });

  it('rejects passwords without lowercase letters', () => {
    const result = validatePasswordPolicy('UPPERCASE@123');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('in thường');
  });

  it('rejects passwords without numbers', () => {
    const result = validatePasswordPolicy('NoNumberHere@!');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('chữ số');
  });

  it('rejects passwords without special characters', () => {
    const result = validatePasswordPolicy('NoSpecialChar123');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('ký tự đặc biệt');
  });

  it('rejects default system passwords (case-insensitive)', () => {
    expect(validatePasswordPolicy('Admin@123').isValid).toBe(false);
    expect(validatePasswordPolicy('admin@123').isValid).toBe(false);
    expect(validatePasswordPolicy('Employee@123').isValid).toBe(false);
    expect(validatePasswordPolicy('Manager@123').isValid).toBe(false);
    expect(validatePasswordPolicy('Fusheng@123').isValid).toBe(false);
    expect(validatePasswordPolicy('Password@123').isValid).toBe(false);

    const defaultCheck = validatePasswordPolicy('Employee@123');
    expect(defaultCheck.message).toContain('mặc định');
  });

  it('accepts compliant strong passwords', () => {
    expect(validatePasswordPolicy('SecureP@ss2026!').isValid).toBe(true);
    expect(validatePasswordPolicy('FuSheng#Dev99').isValid).toBe(true);
    expect(validatePasswordPolicy('VietNam@2026$Win').isValid).toBe(true);
  });
});

describe('Password Policy Route Integration Tests', () => {
  let adminCookie = null;
  let testUser = null;
  let testDept = null;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    testDept = await Department.create({
      code: 'POL_DEPT',
      name: 'Policy Dept',
      description: 'Password Policy Department'
    });

    testUser = await User.create({
      employee_code: 'ADM-POL-01',
      full_name: 'Policy Admin',
      email: 'policy.admin@fusheng.com.vn',
      password: await bcrypt.hash('InitPass@2026', 10),
      role: 'admin',
      position: 'Admin',
      department_id: testDept.id,
      status: 'active',
      must_change_password: false
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'policy.admin@fusheng.com.vn', password: 'InitPass@2026' });

    adminCookie = loginRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('PUT /api/employees/me/password rejects default password (Admin@123)', async () => {
    const res = await request(app)
      .put('/api/employees/me/password')
      .set('Cookie', adminCookie)
      .send({
        current_password: 'InitPass@2026',
        new_password: 'Admin@123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).toContain('mặc định');
  });

  it('PUT /api/employees/me/password rejects password missing special characters', async () => {
    const res = await request(app)
      .put('/api/employees/me/password')
      .set('Cookie', adminCookie)
      .send({
        current_password: 'InitPass@2026',
        new_password: 'Password1234'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).toContain('ký tự đặc biệt');
  });

  it('PUT /api/employees/me/password succeeds with strong compliant password', async () => {
    const res = await request(app)
      .put('/api/employees/me/password')
      .set('Cookie', adminCookie)
      .send({
        current_password: 'InitPass@2026',
        new_password: 'Strong#NewP@ss2026'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('thành công');
  });

  it('POST /api/employees rejects creating user with weak password', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Cookie', adminCookie)
      .send({
        employee_code: 'EMP-WEAK-01',
        full_name: 'Weak Password User',
        email: 'weak.user@fusheng.com.vn',
        password: 'weakpassword',
        role: 'employee',
        position: 'Worker',
        department_id: testDept.id
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

/**
 * Unit & Integration tests for first-time password change mechanism
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User } from '../models/index.js';

let adminCookie = null;
let testDept = null;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testDept = await Department.create({
    code: 'PWD_DEPT',
    name: 'Password Dept',
    description: 'Testing Password Changes'
  });

  await User.create({
    employee_code: 'ADM-PWD-01',
    full_name: 'Admin Password Tester',
    email: 'admin.pwd@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    position: 'IT Admin',
    department_id: testDept.id,
    status: 'active',
    must_change_password: false
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin.pwd@fusheng.com.vn', password: 'Admin@123' });

  adminCookie = adminLogin.headers['set-cookie'];
});

afterAll(async () => {
  await sequelize.close();
});

describe('First-time password change workflow', () => {
  let createdEmployeeId = null;
  const tempPassword = 'TempPassword@123';
  const newPassword = 'NewSecretPassword@456';
  const employeeEmail = 'first.time.emp@fusheng.com.vn';

  it('admin creates an employee with must_change_password default true', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Cookie', adminCookie)
      .send({
        employee_code: 'EMP-FIRST-01',
        full_name: 'First Time Employee',
        email: employeeEmail,
        password: tempPassword,
        role: 'employee',
        position: 'Technician',
        department_id: testDept.id
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.employee).toBeDefined();
    expect(res.body.employee.must_change_password).toBe(true);
    createdEmployeeId = res.body.employee.id;
  });

  it('employee logs in with temporary password and receives must_change_password: true', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: employeeEmail, password: tempPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.must_change_password).toBe(true);
    expect(res.body.user.must_change_password).toBe(true);
    expect(res.body.message).toContain('Ban can doi mat khau lan dau');
  });

  it('employee cannot change password to the same temporary password', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: employeeEmail, password: tempPassword });

    const empCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .put('/api/employees/me/password')
      .set('Cookie', empCookie)
      .send({
        current_password: tempPassword,
        new_password: tempPassword
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('khong duoc trung');
  });

  it('employee successfully changes password, clearing must_change_password', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: employeeEmail, password: tempPassword });

    const empCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .put('/api/employees/me/password')
      .set('Cookie', empCookie)
      .send({
        current_password: tempPassword,
        new_password: newPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.must_change_password).toBe(false);

    // Verify in database
    const updatedUser = await User.findByPk(createdEmployeeId);
    expect(updatedUser.must_change_password).toBe(false);

    // Verify GET /api/auth/me using the updated cookie returned
    const updatedCookie = res.headers['set-cookie'];
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', updatedCookie || empCookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.must_change_password).toBe(false);
  });

  it('admin resetting employee password sets must_change_password back to true', async () => {
    const resetTempPassword = 'ResetPassword@789';

    const res = await request(app)
      .put(`/api/employees/${createdEmployeeId}`)
      .set('Cookie', adminCookie)
      .send({
        password: resetTempPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userInDb = await User.findByPk(createdEmployeeId);
    expect(userInDb.must_change_password).toBe(true);

    // Employee logs in with reset password and sees must_change_password: true
    const empLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: employeeEmail, password: resetTempPassword });

    expect(empLogin.status).toBe(200);
    expect(empLogin.body.must_change_password).toBe(true);
  });
});

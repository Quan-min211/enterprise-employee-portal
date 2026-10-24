/**
 * Smoke tests — Employees & Leave endpoints
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, LeaveRequest } from '../models/index.js';

let adminCookie = null;
let managerCookie = null;
let employeeCookie = null;
let testDept = null;
let testEmployee = null;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testDept = await Department.create({
    code: 'IT2',
    name: 'Phong IT Test',
    description: 'Test department'
  });

  // Admin
  await User.create({
    employee_code: 'ADM-001',
    full_name: 'Admin Test',
    email: 'admin2.test@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    position: 'Admin',
    department_id: testDept.id,
    status: 'active'
  });

  // Manager
  await User.create({
    employee_code: 'MGR-001',
    full_name: 'Manager Test',
    email: 'manager2.test@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    position: 'Manager',
    department_id: testDept.id,
    status: 'active'
  });

  // Employee
  testEmployee = await User.create({
    employee_code: 'EMP-001',
    full_name: 'Employee Test',
    email: 'employee2.test@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    position: 'Nhan vien',
    department_id: testDept.id,
    status: 'active'
  });

  // Get cookies
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin2.test@fusheng.com.vn', password: 'Admin@123' });
  adminCookie = adminLogin.headers['set-cookie'];

  const managerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'manager2.test@fusheng.com.vn', password: 'Manager@123' });
  managerCookie = managerLogin.headers['set-cookie'];

  const employeeLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'employee2.test@fusheng.com.vn', password: 'Employee@123' });
  employeeCookie = employeeLogin.headers['set-cookie'];
});

afterAll(async () => {
  await sequelize.close();
});

// ─── Employees ────────────────────────────────────────────────────────────────

describe('GET /api/employees', () => {
  it('returns 200 with employee list for admin', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.employees)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('returns 200 with employee list for employee', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Cookie', employeeCookie);

    expect(res.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });

  it('filters by department_id', async () => {
    const res = await request(app)
      .get(`/api/employees?department_id=${testDept.id}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.employees.every((e) => e.department_id === testDept.id)).toBe(true);
  });
});

describe('Admin: POST /api/employees (create)', () => {
  it('admin can create a new employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Cookie', adminCookie)
      .send({
        employee_code: 'EMP-NEW-001',
        full_name: 'New Employee',
        email: 'new.employee@fusheng.com.vn',
        password: 'NewPass@123',
        role: 'employee',
        position: 'Test',
        department_id: testDept.id,
        hire_date: '2024-01-01'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.employee.password).toBeUndefined();
  });

  it('employee cannot create another employee (403)', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Cookie', employeeCookie)
      .send({
        employee_code: 'EMP-NEW-002',
        full_name: 'Unauthorized',
        email: 'unauth@fusheng.com.vn',
        password: 'Pass@1234',
        role: 'employee'
      });

    expect(res.status).toBe(403);
  });
});

// ─── Leave Requests ───────────────────────────────────────────────────────────

describe('POST /api/leaves (create leave request)', () => {
  it('employee can submit a leave request', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Cookie', employeeCookie)
      .send({
        request_type: 'leave',
        leave_type: 'annual',
        start_date: '2026-11-01',
        end_date: '2026-11-03',
        reason: 'Nghi phep nam theo quy dinh cong ty'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.request.status).toBe('pending');
  });

  it('returns 400 if reason is too short', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Cookie', employeeCookie)
      .send({
        request_type: 'leave',
        leave_type: 'annual',
        start_date: '2026-11-01',
        end_date: '2026-11-03',
        reason: 'Short'
      });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .send({
        request_type: 'leave',
        leave_type: 'annual',
        start_date: '2026-11-01',
        end_date: '2026-11-03',
        reason: 'Nghi phep nam theo quy dinh cong ty'
      });

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/leaves/:id/status (approve/reject)', () => {
  let leaveId = null;

  beforeAll(async () => {
    const leave = await LeaveRequest.create({
      user_id: testEmployee.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-12-01',
      end_date: '2026-12-02',
      reason: 'Test leave for approval smoke test',
      day_count: 1,
      status: 'pending'
    });
    leaveId = leave.id;
  });

  it('manager can approve a pending leave', async () => {
    const res = await request(app)
      .patch(`/api/leaves/${leaveId}/status`)
      .set('Cookie', managerCookie)
      .send({ status: 'approved', manager_comment: 'OK' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
  });

  it('employee cannot approve leave (403)', async () => {
    // Create another leave
    const leave2 = await LeaveRequest.create({
      user_id: testEmployee.id,
      request_type: 'leave',
      leave_type: 'sick',
      start_date: '2026-12-10',
      end_date: '2026-12-10',
      reason: 'Bi om phai nghi benh theo chi dinh bac si',
      day_count: 1,
      status: 'pending'
    });

    const res = await request(app)
      .patch(`/api/leaves/${leave2.id}/status`)
      .set('Cookie', employeeCookie)
      .send({ status: 'approved' });

    expect(res.status).toBe(403);
  });
});

/**
 * Department Manager Assignment (manager_id) & Scope Resolution Tests
 *
 * Verifies that:
 * 1. Admin can assign/update/clear `manager_id` on departments via POST/PUT /api/departments,
 *    automatically syncing `manager_name` and returning the `manager` association.
 * 2. Invalid/inactive `manager_id` is rejected with HTTP 400.
 * 3. `getManagedDepartmentIds` prioritizes `departments.manager_id` over `user.department_id`
 *    across leaves, leave approval, leave balances, and monthly reports.
 * 4. Fallback to `user.department_id` continues working when `departments.manager_id` is null.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, LeaveRequest } from '../models/index.js';

let deptHr = null;
let deptProd = null;
let deptOther = null;

let adminUser = null;
let managerCross = null;
let managerLegacy = null;
let empProd = null;
let empHr = null;
let empOther = null;

let adminCookie = null;
let managerCrossCookie = null;
let managerLegacyCookie = null;

const createTokenCookie = (user) => {
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
      must_change_password: false
    },
    process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-chars-ok',
    { expiresIn: '8h' }
  );
  return `token=${token}`;
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  deptHr = await Department.create({
    code: 'HR-SCOPE',
    name: 'Phong Nhan Su',
    description: 'HR'
  });

  deptProd = await Department.create({
    code: 'PROD-SCOPE',
    name: 'Xuong San Xuat',
    description: 'Production'
  });

  deptOther = await Department.create({
    code: 'ENG-SCOPE',
    name: 'Phong Ky Thuat',
    description: 'Engineering'
  });

  adminUser = await User.create({
    employee_code: 'ADM-DEP-01',
    full_name: 'Admin Phong Ban',
    email: 'admin.dep@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    department_id: deptHr.id,
    status: 'active'
  });

  // managerCross has home department_id = deptHr, but will be assigned manager_id on deptProd
  managerCross = await User.create({
    employee_code: 'MGR-CROSS-01',
    full_name: 'Quan Doc Dieuchuyen',
    email: 'mgr.cross@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptHr.id,
    status: 'active'
  });

  // managerLegacy has department_id = deptOther, and deptOther.manager_id remains null (fallback test)
  managerLegacy = await User.create({
    employee_code: 'MGR-LEG-01',
    full_name: 'Quan Doc Ky Thuat',
    email: 'mgr.leg@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptOther.id,
    status: 'active'
  });

  empProd = await User.create({
    employee_code: 'EMP-PROD-01',
    full_name: 'Cong Nhan San Xuat',
    email: 'emp.prod@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: deptProd.id,
    status: 'active'
  });

  empHr = await User.create({
    employee_code: 'EMP-HR-01',
    full_name: 'Nhan Vien Nhan Su',
    email: 'emp.hr@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: deptHr.id,
    status: 'active'
  });

  empOther = await User.create({
    employee_code: 'EMP-ENG-01',
    full_name: 'Ky Su Bao Tri',
    email: 'emp.eng@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: deptOther.id,
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerCrossCookie = createTokenCookie(managerCross);
  managerLegacyCookie = createTokenCookie(managerLegacy);
});

describe('Department manager_id CRUD & Validation', () => {
  it('assigns manager_id when creating a department and auto-syncs manager_name', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Cookie', adminCookie)
      .send({
        code: 'QC-NEW',
        name: 'Phong Kiem Tra Chat Luong',
        manager_id: managerCross.id,
        description: 'Quality Control'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.department.manager_id).toBe(managerCross.id);
    expect(res.body.department.manager_name).toBe(managerCross.full_name);
    expect(res.body.department.manager).toBeDefined();
    expect(res.body.department.manager.id).toBe(managerCross.id);

    // Clean up QC-NEW so managerCross only manages deptProd in scope tests below
    await Department.destroy({ where: { id: res.body.department.id }, force: true });
  });

  it('rejects non-existent manager_id with 400', async () => {
    const res = await request(app)
      .post('/api/departments')
      .set('Cookie', adminCookie)
      .send({
        code: 'BAD-MGR',
        name: 'Phong Loi Manager',
        manager_id: 999999
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('updates manager_id on existing department and includes manager in GET /api/departments', async () => {
    const updateRes = await request(app)
      .put(`/api/departments/${deptProd.id}`)
      .set('Cookie', adminCookie)
      .send({
        manager_id: managerCross.id
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.department.manager_id).toBe(managerCross.id);
    expect(updateRes.body.department.manager_name).toBe(managerCross.full_name);
    expect(updateRes.body.department.manager.employee_code).toBe(managerCross.employee_code);

    const listRes = await request(app)
      .get('/api/departments')
      .set('Cookie', adminCookie);

    expect(listRes.status).toBe(200);
    const prod = listRes.body.departments.find((d) => d.id === deptProd.id);
    expect(prod.manager_id).toBe(managerCross.id);
    expect(prod.manager.full_name).toBe(managerCross.full_name);
  });
});

describe('Manager Scoping via departments.manager_id', () => {
  let prodLeave = null;
  let hrLeave = null;
  let engLeave = null;

  beforeAll(async () => {
    prodLeave = await LeaveRequest.create({
      user_id: empProd.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-10',
      end_date: '2026-11-10',
      reason: 'Nghi phep cua nhan vien xuong san xuat',
      day_count: 1,
      status: 'pending'
    });

    hrLeave = await LeaveRequest.create({
      user_id: empHr.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-11',
      end_date: '2026-11-11',
      reason: 'Nghi phep cua nhan vien phong nhan su',
      day_count: 1,
      status: 'pending'
    });

    engLeave = await LeaveRequest.create({
      user_id: empOther.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-12',
      end_date: '2026-11-12',
      reason: 'Nghi phep cua ky su bao tri',
      day_count: 1,
      status: 'pending'
    });
  });

  it('scopes GET /api/leaves to deptProd (via manager_id) rather than home deptHr', async () => {
    const res = await request(app)
      .get('/api/leaves')
      .set('Cookie', managerCrossCookie);

    expect(res.status).toBe(200);
    const ids = res.body.requests.map((r) => r.id);
    expect(ids).toContain(prodLeave.id);
    expect(ids).not.toContain(hrLeave.id);
    expect(ids).not.toContain(engLeave.id);
  });

  it('allows managerCross to approve prodLeave and blocks hrLeave with 403', async () => {
    const okRes = await request(app)
      .patch(`/api/leaves/${prodLeave.id}/status`)
      .set('Cookie', managerCrossCookie)
      .send({ status: 'approved', manager_comment: 'Duyet don cho xuong san xuat' });

    expect(okRes.status).toBe(200);
    expect(okRes.body.request.status).toBe('approved');

    const forbiddenRes = await request(app)
      .patch(`/api/leaves/${hrLeave.id}/status`)
      .set('Cookie', managerCrossCookie)
      .send({ status: 'approved' });

    expect(forbiddenRes.status).toBe(403);
  });

  it('scopes GET /api/leave-balances and GET /api/reports/monthly-summary via manager_id', async () => {
    const balRes = await request(app)
      .get('/api/leave-balances?year=2026')
      .set('Cookie', managerCrossCookie);

    expect(balRes.status).toBe(200);
    const userIds = balRes.body.balances.map((b) => b.user.id);
    expect(userIds).toContain(empProd.id);
    expect(userIds).not.toContain(empHr.id);

    const repRes = await request(app)
      .get('/api/reports/monthly-summary?year=2026')
      .set('Cookie', managerCrossCookie);

    expect(repRes.status).toBe(200);
    const deptCodes = repRes.body.summary.map((d) => d.code);
    expect(deptCodes).toEqual(['PROD-SCOPE']);
  });

  it('falls back to user.department_id when department.manager_id is null', async () => {
    const res = await request(app)
      .get('/api/leaves')
      .set('Cookie', managerLegacyCookie);

    expect(res.status).toBe(200);
    const ids = res.body.requests.map((r) => r.id);
    expect(ids).toContain(engLeave.id);
    expect(ids).not.toContain(prodLeave.id);
  });
});

/**
 * Dashboard Top OT Departments Report Tests
 *
 * Verifies plant-wide ranking of departments with highest overtime (OT) hours,
 * average OT hours per worker, limit filtering, year filtering, manager department
 * identification, and integration into the dashboard summary payload.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, LeaveRequest } from '../models/index.js';

let deptProd = null;
let deptEng = null;
let deptHr = null;
let adminUser = null;
let managerProd = null;
let workerProd = null;
let workerEng = null;

let adminCookie = null;
let managerProdCookie = null;

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

  deptProd = await Department.create({
    code: 'PROD',
    name: 'Phòng Sản Xuất',
    description: 'Xưởng lắp ráp máy nén'
  });

  deptEng = await Department.create({
    code: 'ENG',
    name: 'Phòng Kỹ Thuật Cơ Điện',
    description: 'Bảo trì cơ điện nhà máy'
  });

  deptHr = await Department.create({
    code: 'HR',
    name: 'Phòng Nhân Sự',
    description: 'Khối văn phòng nhân sự'
  });

  adminUser = await User.create({
    employee_code: 'ADM-OT-01',
    full_name: 'Quản Trị Viên',
    email: 'admin.ot@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    department_id: deptHr.id,
    status: 'active'
  });

  managerProd = await User.create({
    employee_code: 'MGR-PROD-01',
    full_name: 'Quản Đốc Sản Xuất',
    email: 'mgr.prod@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptProd.id,
    status: 'active'
  });

  workerProd = await User.create({
    employee_code: 'WRK-PROD-01',
    full_name: 'Công Nhân Tiện CNC',
    email: 'worker.prod@fusheng.com.vn',
    password: await bcrypt.hash('Worker@123', 10),
    role: 'employee',
    department_id: deptProd.id,
    status: 'active'
  });

  workerEng = await User.create({
    employee_code: 'WRK-ENG-01',
    full_name: 'Kỹ Sư Cơ Điện',
    email: 'worker.eng@fusheng.com.vn',
    password: await bcrypt.hash('Worker@123', 10),
    role: 'employee',
    department_id: deptEng.id,
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerProdCookie = createTokenCookie(managerProd);

  // Seed OT data for 2026:
  // PROD Department:
  // 1. OT 8.0 hours approved
  await LeaveRequest.create({
    user_id: workerProd.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2026-04-10',
    end_date: '2026-04-10',
    day_count: 0.5,
    ot_hours: 8.0,
    status: 'approved',
    reason: 'Gia công gấp lô vỏ máy nén đơn hàng xuất khẩu'
  });

  // 2. OT 4.5 hours approved
  await LeaveRequest.create({
    user_id: workerProd.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2026-04-15',
    end_date: '2026-04-15',
    day_count: 0.5,
    ot_hours: 4.5,
    status: 'approved',
    reason: 'Tăng ca kiểm tra máy áp suất cao'
  });

  // 3. OT pending 3.0 hours (not approved yet)
  await LeaveRequest.create({
    user_id: workerProd.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2026-04-20',
    end_date: '2026-04-20',
    day_count: 0.5,
    ot_hours: 3.0,
    status: 'pending',
    reason: 'Tăng ca chuẩn bị thiết bị tuần tới'
  });

  // 4. Leave request (NOT overtime) - should be excluded from OT hours
  await LeaveRequest.create({
    user_id: workerProd.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2026-04-01',
    end_date: '2026-04-02',
    day_count: 2.0,
    status: 'approved',
    reason: 'Nghỉ phép thường'
  });

  // ENG Department:
  // 1. OT 6.0 hours approved
  await LeaveRequest.create({
    user_id: workerEng.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2026-04-12',
    end_date: '2026-04-12',
    day_count: 0.5,
    ot_hours: 6.0,
    status: 'approved',
    reason: 'Bảo trì định kỳ máy biến áp phân xưởng'
  });

  // HR Department:
  // 0 OT hours

  // 2025 OT Request (different year):
  await LeaveRequest.create({
    user_id: workerEng.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2025-05-10',
    end_date: '2025-05-10',
    day_count: 0.5,
    ot_hours: 10.0,
    status: 'approved',
    reason: 'OT năm 2025'
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/dashboard/top-ot-departments', () => {
  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/dashboard/top-ot-departments');
    expect(res.status).toBe(401);
  });

  it('validates year parameter with 400 if out of range', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-ot-departments?year=2015')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('validates limit parameter with 400 if out of range', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-ot-departments?limit=99')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('correctly ranks departments by total approved OT hours descending', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-ot-departments?year=2026')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.year).toBe(2026);
    expect(data.departments.length).toBeGreaterThanOrEqual(2);

    // PROD has 12.5h (8.0 + 4.5), should be rank #1
    const rank1 = data.departments[0];
    expect(rank1.rank).toBe(1);
    expect(rank1.code).toBe('PROD');
    expect(rank1.name).toBe('Phòng Sản Xuất');
    expect(rank1.totalOtHours).toBe(12.5);
    expect(rank1.totalRequests).toBe(3); // 2 approved + 1 pending
    expect(rank1.approvedCount).toBe(2);
    expect(rank1.pendingCount).toBe(1);
    expect(rank1.totalStaff).toBe(2); // managerProd + workerProd
    expect(rank1.avgOtHoursPerStaff).toBe(6.3); // 12.5 / 2 = 6.25 -> 6.3

    // ENG has 6.0h, should be rank #2
    const rank2 = data.departments[1];
    expect(rank2.rank).toBe(2);
    expect(rank2.code).toBe('ENG');
    expect(rank2.name).toBe('Phòng Kỹ Thuật Cơ Điện');
    expect(rank2.totalOtHours).toBe(6.0);
    expect(rank2.approvedCount).toBe(1);
    expect(rank2.totalStaff).toBe(1);
    expect(rank2.avgOtHoursPerStaff).toBe(6.0);

    // Plant-wide totals
    expect(data.factoryTotalOtHours).toBe(18.5); // 12.5 + 6.0
    expect(data.factoryTotalOtRequests).toBe(4); // 3 (PROD) + 1 (ENG)
    expect(data.topDepartment).toBeDefined();
    expect(data.topDepartment.code).toBe('PROD');
  });

  it('respects limit parameter and returns top N departments only', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-ot-departments?year=2026&limit=1')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.departments.length).toBe(1);
    expect(res.body.data.departments[0].code).toBe('PROD');
  });

  it('flags isMyDepartment: true for the manager own department', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-ot-departments?year=2026')
      .set('Cookie', managerProdCookie);

    expect(res.status).toBe(200);
    const prodDept = res.body.data.departments.find((d) => d.code === 'PROD');
    const engDept = res.body.data.departments.find((d) => d.code === 'ENG');

    expect(prodDept.isMyDepartment).toBe(true);
    expect(engDept.isMyDepartment).toBe(false);
  });

  it('returns previous year OT data when requested', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-ot-departments?year=2025')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.year).toBe(2025);
    expect(data.factoryTotalOtHours).toBe(10.0);

    const rank1 = data.departments[0];
    expect(rank1.code).toBe('ENG');
    expect(rank1.totalOtHours).toBe(10.0);
  });
});

describe('GET /api/dashboard/summary (Inclusion of topOtDepartments)', () => {
  it('includes topOtDepartments in the dashboard summary payload', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.topOtDepartments).toBeDefined();
    expect(Array.isArray(res.body.summary.topOtDepartments.departments)).toBe(true);
    expect(res.body.summary.topOtDepartments.departments[0].code).toBe('PROD');
  });
});


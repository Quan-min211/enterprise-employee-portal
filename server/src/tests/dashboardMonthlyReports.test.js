/**
 * Dashboard Monthly Requests Report Tests
 *
 * Verifies 12-month aggregation of leave and overtime requests,
 * role-based scoping (Admin, Manager, Employee), year filtering,
 * and inclusion in the dashboard summary payload.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, LeaveRequest } from '../models/index.js';

let deptProd = null;
let deptHr = null;
let adminUser = null;
let managerUser = null;
let employeeUser = null;

let adminCookie = null;
let managerCookie = null;
let employeeCookie = null;

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
    description: 'Bộ phận xưởng sản xuất'
  });

  deptHr = await Department.create({
    code: 'HR',
    name: 'Phòng Nhân Sự',
    description: 'Bộ phận quản lý nhân sự'
  });

  adminUser = await User.create({
    employee_code: 'ADM-REP-01',
    full_name: 'Quản Trị Viên',
    email: 'admin.rep@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    department_id: deptHr.id,
    status: 'active'
  });

  managerUser = await User.create({
    employee_code: 'MGR-REP-01',
    full_name: 'Quản Lý Sản Xuất',
    email: 'mgr.rep@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptProd.id,
    status: 'active'
  });

  employeeUser = await User.create({
    employee_code: 'EMP-REP-01',
    full_name: 'Công Nhân Sản Xuất',
    email: 'worker.rep@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: deptProd.id,
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerCookie = createTokenCookie(managerUser);
  employeeCookie = createTokenCookie(employeeUser);

  // Seed sample requests across different months in 2026:
  // Tháng 1 (January): 1 leave request by employee (PROD) - approved
  await LeaveRequest.create({
    user_id: employeeUser.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2026-01-15',
    end_date: '2026-01-16',
    day_count: 2.0,
    status: 'approved',
    reason: 'Nghỉ việc gia đình tháng 1'
  });

  // Tháng 3 (March): 1 OT request by employee (PROD) - approved
  await LeaveRequest.create({
    user_id: employeeUser.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2026-03-10',
    end_date: '2026-03-10',
    day_count: 0.5,
    ot_hours: 4.0,
    status: 'approved',
    reason: 'Tăng ca sửa máy nén tháng 3'
  });

  // Tháng 3 (March): 1 leave request by employee (PROD) - rejected
  await LeaveRequest.create({
    user_id: employeeUser.id,
    request_type: 'leave',
    leave_type: 'sick',
    start_date: '2026-03-20',
    end_date: '2026-03-20',
    day_count: 1.0,
    status: 'rejected',
    reason: 'Nghỉ ốm đột xuất không kèm giấy tờ'
  });

  // Tháng 3 (March): 1 leave request by admin (HR) - approved
  await LeaveRequest.create({
    user_id: adminUser.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2026-03-25',
    end_date: '2026-03-26',
    day_count: 2.0,
    status: 'approved',
    reason: 'Nghỉ phép năm quản trị viên'
  });

  // 2025 Request: 1 leave request in 2025
  await LeaveRequest.create({
    user_id: employeeUser.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2025-07-10',
    end_date: '2025-07-11',
    day_count: 2.0,
    status: 'approved',
    reason: 'Nghỉ phép năm 2025'
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/dashboard/monthly-requests', () => {
  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/dashboard/monthly-requests');
    expect(res.status).toBe(401);
  });

  it('validates year parameter with 400 when out of range', async () => {
    const res = await request(app)
      .get('/api/dashboard/monthly-requests?year=1999')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('allows admin to fetch factory-wide 12-month requests breakdown for 2026', async () => {
    const res = await request(app)
      .get('/api/dashboard/monthly-requests?year=2026')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.year).toBe(2026);
    expect(data.yearTotal).toBe(4);
    expect(data.months.length).toBe(12);

    // Tháng 1 (January): 1 leave approved
    const m1 = data.months[0];
    expect(m1.month).toBe(1);
    expect(m1.total).toBe(1);
    expect(m1.leaveCount).toBe(1);
    expect(m1.otCount).toBe(0);
    expect(m1.approvedCount).toBe(1);

    // Tháng 3 (March): 3 requests total (2 from PROD, 1 from HR)
    const m3 = data.months[2];
    expect(m3.month).toBe(3);
    expect(m3.total).toBe(3);
    expect(m3.leaveCount).toBe(2);
    expect(m3.otCount).toBe(1);
    expect(m3.approvedCount).toBe(2);
    expect(m3.rejectedCount).toBe(1);
    expect(m3.approvedOtHours).toBe(4.0);

    // Peak month verification
    expect(data.peakMonth).toBeDefined();
    expect(data.peakMonth.month).toBe(3);
    expect(data.peakMonth.total).toBe(3);
  });

  it('allows admin to filter monthly breakdown by department_id', async () => {
    const res = await request(app)
      .get(`/api/dashboard/monthly-requests?year=2026&department_id=${deptProd.id}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.yearTotal).toBe(3); // only PROD requests (exclude HR request)

    const m3 = data.months[2];
    expect(m3.total).toBe(2); // 2 requests in PROD
  });

  it('scopes manager to only their own department requests', async () => {
    const res = await request(app)
      .get('/api/dashboard/monthly-requests?year=2026')
      .set('Cookie', managerCookie);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.yearTotal).toBe(3); // Only PROD requests

    const m3 = data.months[2];
    expect(m3.total).toBe(2); // Excludes HR admin's request
  });

  it('scopes regular employee to only their own requests', async () => {
    const res = await request(app)
      .get('/api/dashboard/monthly-requests?year=2026')
      .set('Cookie', employeeCookie);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.yearTotal).toBe(3); // Employee's own requests only
  });

  it('returns previous year (2025) statistics when requested', async () => {
    const res = await request(app)
      .get('/api/dashboard/monthly-requests?year=2025')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.year).toBe(2025);
    expect(data.yearTotal).toBe(1);

    const m7 = data.months[6]; // July
    expect(m7.total).toBe(1);
    expect(m7.leaveCount).toBe(1);
  });
});

describe('GET /api/dashboard/summary (Inclusion of monthlyRequests)', () => {
  it('includes monthlyRequests with 12 months in the summary response', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.monthlyRequests).toBeDefined();
    expect(res.body.summary.monthlyRequests.months.length).toBe(12);
  });
});


/**
 * Dashboard Approval & Rejection Rate Report Tests
 *
 * Verifies calculation of approval and rejection rates, decision turnaround metrics,
 * request type breakdowns (leave vs overtime), 12-month trend, department comparison,
 * role-based scoping (admin vs manager vs employee), and integration into dashboard summary.
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
let workerProdCookie = null;

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
    description: 'Xưởng sản xuất Fu Sheng'
  });

  deptEng = await Department.create({
    code: 'ENG',
    name: 'Phòng Kỹ Thuật',
    description: 'Đội ngũ kỹ thuật bảo trì'
  });

  deptHr = await Department.create({
    code: 'HR',
    name: 'Phòng Hành Chính Nhân Sự',
    description: 'Khối văn phòng HR'
  });

  adminUser = await User.create({
    employee_code: 'ADM-AR-01',
    full_name: 'Quản Trị Hệ Thống',
    email: 'admin.ar@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    department_id: deptHr.id,
    status: 'active'
  });

  managerProd = await User.create({
    employee_code: 'MGR-AR-01',
    full_name: 'Quản Đốc Phân Xưởng',
    email: 'mgr.ar@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptProd.id,
    status: 'active'
  });

  workerProd = await User.create({
    employee_code: 'WRK-AR-01',
    full_name: 'Công Nhân Sản Xuất',
    email: 'worker.ar.prod@fusheng.com.vn',
    password: await bcrypt.hash('Worker@123', 10),
    role: 'employee',
    department_id: deptProd.id,
    status: 'active'
  });

  workerEng = await User.create({
    employee_code: 'WRK-AR-02',
    full_name: 'Kỹ Sư Cơ Điện',
    email: 'worker.ar.eng@fusheng.com.vn',
    password: await bcrypt.hash('Worker@123', 10),
    role: 'employee',
    department_id: deptEng.id,
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerProdCookie = createTokenCookie(managerProd);
  workerProdCookie = createTokenCookie(workerProd);

  // Seed sample requests for 2026:
  // PROD Department:
  // 1. WorkerProd Leave (Approved) - 2 days
  await LeaveRequest.create({
    user_id: workerProd.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2026-03-02',
    end_date: '2026-03-03',
    day_count: 2.0,
    status: 'approved',
    reason: 'Nghỉ phép thường niên'
  });

  // 2. WorkerProd Leave (Rejected) - 1 day
  await LeaveRequest.create({
    user_id: workerProd.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2026-03-10',
    end_date: '2026-03-10',
    day_count: 1.0,
    status: 'rejected',
    reason: 'Trùng ca sản xuất cao điểm',
    manager_comment: 'Không thể bố trí người thay thế'
  });

  // 3. WorkerProd Overtime (Approved) - 4 hours
  await LeaveRequest.create({
    user_id: workerProd.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2026-03-15',
    end_date: '2026-03-15',
    day_count: 0.5,
    ot_hours: 4.0,
    status: 'approved',
    reason: 'Lắp ráp tăng ca cuối tuần'
  });

  // 4. WorkerProd Overtime (Pending) - 3 hours
  await LeaveRequest.create({
    user_id: workerProd.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2026-03-22',
    end_date: '2026-03-22',
    day_count: 0.5,
    ot_hours: 3.0,
    status: 'pending',
    reason: 'Chuẩn bị đơn hàng xuất khẩu'
  });

  // ENG Department:
  // 5. WorkerEng Leave (Approved) - 1 day
  await LeaveRequest.create({
    user_id: workerEng.id,
    request_type: 'leave',
    leave_type: 'sick',
    start_date: '2026-04-05',
    end_date: '2026-04-05',
    day_count: 1.0,
    status: 'approved',
    reason: 'Khám sức khỏe định kỳ'
  });

  // 6. WorkerEng Overtime (Rejected) - 5 hours
  await LeaveRequest.create({
    user_id: workerEng.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2026-04-12',
    end_date: '2026-04-12',
    day_count: 0.5,
    ot_hours: 5.0,
    status: 'rejected',
    reason: 'Đề xuất OT chưa có phê duyệt trước',
    manager_comment: 'Cần đăng ký trước 24 giờ'
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/dashboard/approval-rate', () => {
  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/dashboard/approval-rate');
    expect(res.status).toBe(401);
  });

  it('validates year query with 400 if out of range', async () => {
    const res = await request(app)
      .get('/api/dashboard/approval-rate?year=2010')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('validates request_type query with 400 if invalid enum', async () => {
    const res = await request(app)
      .get('/api/dashboard/approval-rate?request_type=invalid_type')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns factory-wide approval rate statistics for admin', async () => {
    const res = await request(app)
      .get('/api/dashboard/approval-rate?year=2026')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.year).toBe(2026);
    expect(data.totalRequests).toBe(6);
    // Decided = 3 approved + 2 rejected = 5
    expect(data.approvedCount).toBe(3);
    expect(data.rejectedCount).toBe(2);
    expect(data.pendingCount).toBe(1);
    expect(data.decidedCount).toBe(5);

    // Approval rate = (3 / 5) * 100 = 60.0%
    expect(data.approvalRate).toBe(60.0);
    // Rejection rate = (2 / 5) * 100 = 40.0%
    expect(data.rejectionRate).toBe(40.0);

    // By type verification
    expect(data.byType.leave.total).toBe(3);
    expect(data.byType.leave.approved).toBe(2);
    expect(data.byType.leave.rejected).toBe(1);
    expect(data.byType.leave.approvalRate).toBe(66.7); // 2/3

    expect(data.byType.overtime.total).toBe(3);
    expect(data.byType.overtime.approved).toBe(1);
    expect(data.byType.overtime.rejected).toBe(1);
    expect(data.byType.overtime.pending).toBe(1);
    expect(data.byType.overtime.approvalRate).toBe(50.0); // 1/2 decided

    // Department comparison present for admin
    expect(Array.isArray(data.departmentComparison)).toBe(true);
    expect(data.departmentComparison.length).toBeGreaterThanOrEqual(3);
  });

  it('scopes approval rate statistics to manager department', async () => {
    const res = await request(app)
      .get('/api/dashboard/approval-rate?year=2026')
      .set('Cookie', managerProdCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // Manager PROD only sees PROD requests (4 total: 2 approved, 1 rejected, 1 pending)
    expect(data.totalRequests).toBe(4);
    expect(data.approvedCount).toBe(2);
    expect(data.rejectedCount).toBe(1);
    expect(data.pendingCount).toBe(1);
    expect(data.decidedCount).toBe(3);

    // (2 / 3) * 100 = 66.7%
    expect(data.approvalRate).toBe(66.7);
    expect(data.rejectionRate).toBe(33.3);

    // Check manager department flag
    const prodComparison = data.departmentComparison.find((d) => d.code === 'PROD');
    expect(prodComparison).toBeDefined();
    expect(prodComparison.isMyDepartment).toBe(true);
  });

  it('scopes approval rate statistics to individual employee requests', async () => {
    const res = await request(app)
      .get('/api/dashboard/approval-rate?year=2026')
      .set('Cookie', workerProdCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // WorkerProd has 4 requests
    expect(data.totalRequests).toBe(4);
    expect(data.approvedCount).toBe(2);
    expect(data.rejectedCount).toBe(1);
    expect(data.pendingCount).toBe(1);
    expect(data.approvalRate).toBe(66.7);

    // Regular employee does not receive plant-wide department comparison
    expect(data.departmentComparison.length).toBe(0);
  });

  it('filters approval rate statistics by request_type (leave only)', async () => {
    const res = await request(app)
      .get('/api/dashboard/approval-rate?year=2026&request_type=leave')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.requestType).toBe('leave');
    expect(data.totalRequests).toBe(3);
    expect(data.approvedCount).toBe(2);
    expect(data.rejectedCount).toBe(1);
    expect(data.pendingCount).toBe(0);
    expect(data.approvalRate).toBe(66.7);
  });

  it('filters approval rate statistics by department_id for admin', async () => {
    const res = await request(app)
      .get(`/api/dashboard/approval-rate?year=2026&department_id=${deptEng.id}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // ENG department has 2 requests (1 approved leave, 1 rejected overtime)
    expect(data.totalRequests).toBe(2);
    expect(data.approvedCount).toBe(1);
    expect(data.rejectedCount).toBe(1);
    expect(data.approvalRate).toBe(50.0);
    expect(data.rejectionRate).toBe(50.0);
  });

  it('includes 12-month trend array with proper labels and rates', async () => {
    const res = await request(app)
      .get('/api/dashboard/approval-rate?year=2026')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.monthlyTrend).toHaveLength(12);

    // March (index 2) had 4 requests in PROD (2 approved, 1 rejected, 1 pending)
    const march = data.monthlyTrend[2];
    expect(march.month).toBe(3);
    expect(march.label).toBe('T3');
    expect(march.total).toBe(4);
    expect(march.approved).toBe(2);
    expect(march.rejected).toBe(1);
    expect(march.pending).toBe(1);
    expect(march.approvalRate).toBe(66.7);
  });

  it('integrates approval rate stats directly into GET /api/dashboard/summary', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = res.body.summary;
    expect(summary.approvalStats).toBeDefined();
    expect(summary.approvalStats.year).toBe(new Date().getFullYear());
    expect(summary.approvalStats.totalRequests).toBe(6);
    expect(summary.approvalStats.approvalRate).toBe(60.0);
  });
});


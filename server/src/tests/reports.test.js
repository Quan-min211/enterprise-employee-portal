/**
 * Monthly & Annual Reporting API & CSV Export Tests
 *
 * Verifies monthly/annual departmental aggregation, role-based scoping (RBAC),
 * parameter validation, forensic audit logging, and UTF-8 BOM CSV export for Excel compatibility.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, LeaveRequest, AuditLog } from '../models/index.js';

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
    description: 'Bộ phận chế tạo và sản xuất công nghiệp'
  });

  deptHr = await Department.create({
    code: 'HR',
    name: 'Phòng Hành Chính Nhân Sự',
    description: 'Bộ phận nhân sự và quản trị'
  });

  adminUser = await User.create({
    employee_code: 'ADM-REP-01',
    full_name: 'Quản Trị Báo Cáo',
    email: 'admin.rep@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    position: 'Trưởng ban điều hành',
    department_id: deptHr.id,
    hire_date: '2024-01-01',
    status: 'active'
  });

  managerUser = await User.create({
    employee_code: 'MGR-REP-01',
    full_name: 'Quản Lý Xưởng Sản Xuất',
    email: 'mgr.rep@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    position: 'Quản đốc xưởng',
    department_id: deptProd.id,
    hire_date: '2024-02-01',
    status: 'active'
  });

  employeeUser = await User.create({
    employee_code: 'EMP-REP-01',
    full_name: 'Lê Kỹ Thuật Viên',
    email: 'worker.rep@fusheng.com.vn',
    password: await bcrypt.hash('Worker@123', 10),
    role: 'employee',
    position: 'Kỹ thuật viên vận hành máy',
    department_id: deptProd.id,
    hire_date: '2024-03-01',
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerCookie = createTokenCookie(managerUser);
  employeeCookie = createTokenCookie(employeeUser);

  // Seed sample Leave & OT requests for 2026
  // March 2026 - PROD department
  await LeaveRequest.create({
    user_id: employeeUser.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2026-03-05',
    end_date: '2026-03-06',
    day_count: 2.0,
    status: 'approved',
    reason: 'Xin nghỉ phép thăm người thân tại quê nhà'
  });

  await LeaveRequest.create({
    user_id: employeeUser.id,
    request_type: 'overtime',
    leave_type: 'overtime',
    start_date: '2026-03-10',
    end_date: '2026-03-10',
    day_count: 0.5,
    ot_hours: 4.0,
    status: 'approved',
    reason: 'Tăng ca bảo trì hệ thống máy nén khí áp lực cao'
  });

  await LeaveRequest.create({
    user_id: employeeUser.id,
    request_type: 'leave',
    leave_type: 'sick',
    start_date: '2026-03-15',
    end_date: '2026-03-15',
    day_count: 1.0,
    status: 'rejected',
    reason: 'Đề xuất nghỉ đột xuất không kèm giấy tờ y tế'
  });

  // March 2026 - HR department
  await LeaveRequest.create({
    user_id: adminUser.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2026-03-20',
    end_date: '2026-03-20',
    day_count: 1.0,
    status: 'approved',
    reason: 'Nghỉ giải quyết việc gia đình'
  });

  // Previous year request (2025)
  await LeaveRequest.create({
    user_id: employeeUser.id,
    request_type: 'leave',
    leave_type: 'annual',
    start_date: '2025-11-10',
    end_date: '2025-11-12',
    day_count: 3.0,
    status: 'approved',
    reason: 'Nghỉ phép năm 2025'
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/reports/monthly-summary (JSON Report)', () => {
  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/reports/monthly-summary');
    expect(res.status).toBe(401);
  });

  it('blocks regular employee role with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-summary')
      .set('Cookie', employeeCookie);
    expect(res.status).toBe(403);
  });

  it('allows admin to fetch monthly JSON summary with aggregated metrics', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-summary?year=2026&month=3')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.period.year).toBe(2026);
    expect(res.body.period.month).toBe(3);
    expect(res.body.period.label).toBe('Tháng 03/2026');
    expect(Array.isArray(res.body.summary)).toBe(true);
    expect(res.body.summary.length).toBe(2);

    // PROD department assertions
    const prodDept = res.body.summary.find((d) => d.code === 'PROD');
    expect(prodDept).toBeDefined();
    expect(prodDept.totalStaff).toBe(2); // managerUser + employeeUser
    expect(prodDept.totalRequests).toBe(3);
    expect(prodDept.approvedCount).toBe(2);
    expect(prodDept.rejectedCount).toBe(1);
    expect(prodDept.approvedLeaveDays).toBe(2.0);
    expect(prodDept.approvedOtHours).toBe(4.0);

    // Grand total assertions
    expect(res.body.grandTotal.totalStaff).toBe(3);
    expect(res.body.grandTotal.totalRequests).toBe(4);
    expect(res.body.grandTotal.approvedCount).toBe(3);
  });

  it('scopes manager to only their own department in JSON summary', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-summary?year=2026&month=3')
      .set('Cookie', managerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.length).toBe(1);
    expect(res.body.summary[0].code).toBe('PROD');
  });
});

describe('GET /api/reports/monthly-summary/export (CSV Export)', () => {
  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/reports/monthly-summary/export');
    expect(res.status).toBe(401);
  });

  it('blocks regular employee role with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-summary/export')
      .set('Cookie', employeeCookie);
    expect(res.status).toBe(403);
  });

  it('validates year and month parameters', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-summary/export?year=1990&month=13')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('allows admin to export monthly report with UTF-8 BOM, headers, and grand total', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-summary/export?year=2026&month=3')
      .set('Cookie', adminCookie)
      .buffer(true)
      .parse((r, cb) => {
        let data = Buffer.from([]);
        r.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });
        r.on('end', () => cb(null, data));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="bao-cao-dinh-ky-2026-03-');

    const buffer = res.body;
    // Check UTF-8 BOM: EF BB BF
    expect(buffer[0]).toBe(0xef);
    expect(buffer[1]).toBe(0xbb);
    expect(buffer[2]).toBe(0xbf);

    const text = buffer.slice(3).toString('utf-8');

    // Headers verification
    expect(text).toContain('"Năm","Kỳ báo cáo","Mã phòng ban","Tên phòng ban","Tổng nhân sự","Tổng số đơn","Đơn đã duyệt","Đơn từ chối","Đơn chờ duyệt","Đơn đã hủy","Tổng ngày phép đã duyệt","Tổng giờ OT đã duyệt","Tỷ lệ duyệt (%)"');

    // Data verification
    expect(text).toContain('"PROD"');
    expect(text).toContain('"Phòng Sản Xuất"');
    expect(text).toContain('"HR"');
    expect(text).toContain('"Phòng Hành Chính Nhân Sự"');

    // Grand total row
    expect(text).toContain('"TOÀN NHÀ MÁY","Tổng hợp tất cả bộ phận"');
  });

  it('allows admin to export full-year annual report without month query parameter', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-summary/export?year=2026')
      .set('Cookie', adminCookie)
      .buffer(true)
      .parse((r, cb) => {
        let data = Buffer.from([]);
        r.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });
        r.on('end', () => cb(null, data));
      });

    expect(res.status).toBe(200);
    const text = res.body.slice(3).toString('utf-8');
    expect(text).toContain('"Cả năm 2026"');
  });

  it('scopes manager export to their own managed department only', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-summary/export?year=2026&month=3')
      .set('Cookie', managerCookie)
      .buffer(true)
      .parse((r, cb) => {
        let data = Buffer.from([]);
        r.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });
        r.on('end', () => cb(null, data));
      });

    expect(res.status).toBe(200);
    const text = res.body.slice(3).toString('utf-8');

    expect(text).toContain('"PROD"');
    expect(text).not.toContain('"HR"');
  });

  it('creates an audit log entry for report export', async () => {
    await request(app)
      .get('/api/reports/monthly-summary/export?year=2026&month=3')
      .set('Cookie', adminCookie);

    const log = await AuditLog.findOne({
      where: {
        user_id: adminUser.id,
        action: 'report.export'
      },
      order: [['created_at', 'DESC']]
    });

    expect(log).not.toBeNull();
    expect(log.entity_type).toBe('report');
    expect(log.details).toBeDefined();
    expect(log.details.year).toBe(2026);
    expect(log.details.month).toBe(3);
  });
});


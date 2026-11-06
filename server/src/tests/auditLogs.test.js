/**
 * Audit Logs API & CSV Export Tests
 *
 * Verifies admin-only audit log querying, filtering, forensic tracking,
 * and UTF-8 BOM CSV export for security investigations and compliance audits.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, AuditLog } from '../models/index.js';

let dept = null;
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

  dept = await Department.create({
    code: 'SEC_AUDIT',
    name: 'Phòng An Ninh Thông Tin',
    description: 'Phòng ban kiểm thử audit logs'
  });

  adminUser = await User.create({
    employee_code: 'SEC-ADM-01',
    full_name: 'Quản Trị An Ninh',
    email: 'sec.admin@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    position: 'Chuyên viên an toàn thông tin',
    department_id: dept.id,
    status: 'active'
  });

  managerUser = await User.create({
    employee_code: 'SEC-MGR-01',
    full_name: 'Quản Lý Sản Xuất',
    email: 'prod.mgr@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: dept.id,
    status: 'active'
  });

  employeeUser = await User.create({
    employee_code: 'SEC-EMP-01',
    full_name: 'Nhân Viên Vận Hành',
    email: 'operator@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: dept.id,
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerCookie = createTokenCookie(managerUser);
  employeeCookie = createTokenCookie(employeeUser);

  // Seed sample audit logs
  await AuditLog.bulkCreate([
    {
      user_id: adminUser.id,
      action: 'auth.login.success',
      entity_type: 'user',
      entity_id: adminUser.id,
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      request_id: '11111111-2222-3333-4444-555555555555',
      details: { method: 'password' },
      created_at: new Date('2026-03-01T08:00:00Z')
    },
    {
      user_id: employeeUser.id,
      action: 'leave.create',
      entity_type: 'leave_request',
      entity_id: 101,
      ip_address: '192.168.1.105',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      request_id: '66666666-7777-8888-9999-000000000000',
      details: { request_type: 'leave', days: 1.5 },
      created_at: new Date('2026-03-01T09:30:00Z')
    },
    {
      user_id: adminUser.id,
      action: 'employee.create',
      entity_type: 'user',
      entity_id: employeeUser.id,
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      request_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      details: { employee_code: 'SEC-EMP-01' },
      created_at: new Date('2026-03-01T10:15:00Z')
    }
  ]);
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/audit-logs (Listing API)', () => {
  it('blocks unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(401);
  });

  it('blocks employee and manager roles with 403 (Admin only)', async () => {
    const empRes = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', employeeCookie);
    expect(empRes.status).toBe(403);

    const mgrRes = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', managerCookie);
    expect(mgrRes.status).toBe(403);
  });

  it('allows admin to query paginated audit logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.logs[0].actor).toBeDefined();
  });
});

describe('GET /api/audit-logs/export (CSV Export)', () => {
  it('blocks unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/audit-logs/export');
    expect(res.status).toBe(401);
  });

  it('blocks non-admin users with 403 Forbidden', async () => {
    const empRes = await request(app)
      .get('/api/audit-logs/export')
      .set('Cookie', employeeCookie);
    expect(empRes.status).toBe(403);

    const mgrRes = await request(app)
      .get('/api/audit-logs/export')
      .set('Cookie', managerCookie);
    expect(mgrRes.status).toBe(403);
  });

  it('allows admin to export all audit logs with UTF-8 BOM CSV', async () => {
    const res = await request(app)
      .get('/api/audit-logs/export')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="audit-logs-');

    const text = res.text;
    // Must start with UTF-8 BOM (\uFEFF)
    expect(text.startsWith('\uFEFF')).toBe(true);

    // Headers verification
    expect(text).toContain('"Mã nhật ký","Thời điểm","Người thực hiện","Mã nhân viên","Vai trò","Hành động","Đối tượng","Mã đối tượng","Địa chỉ IP","Mã truy vết (Request ID)","Chi tiết"');

    // Data verification
    expect(text).toContain('auth.login.success');
    expect(text).toContain('leave.create');
    expect(text).toContain('192.168.1.100');
    expect(text).toContain('11111111-2222-3333-4444-555555555555');
  });

  it('filters export by action', async () => {
    const res = await request(app)
      .get('/api/audit-logs/export?action=leave.create')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain('leave.create');
    expect(res.text).not.toContain('auth.login.success');
  });

  it('filters export by entity_type', async () => {
    const res = await request(app)
      .get('/api/audit-logs/export?entity_type=leave_request')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain('leave_request');
    expect(res.text).not.toContain('auth.login.success');
  });

  it('filters export by IP address', async () => {
    const res = await request(app)
      .get('/api/audit-logs/export?ip_address=192.168.1.105')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain('192.168.1.105');
    expect(res.text).toContain('leave.create');
    expect(res.text).not.toContain('auth.login.success');
  });

  it('creates an audit log entry when export is performed', async () => {
    const exportAudit = await AuditLog.findOne({
      where: {
        action: 'audit_log.export',
        user_id: adminUser.id
      },
      order: [['created_at', 'DESC']]
    });

    expect(exportAudit).not.toBeNull();
    expect(exportAudit.entity_type).toBe('audit_log');
  });
});


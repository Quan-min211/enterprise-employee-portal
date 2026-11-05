/**
 * Employee Management & CSV Export Tests
 *
 * Verifies employee directory querying, CRUD, role-scoped CSV export with UTF-8 BOM,
 * and forensic audit logging.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, AuditLog } from '../models/index.js';

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
    description: 'Khối xưởng gia công lắp ráp'
  });

  deptHr = await Department.create({
    code: 'HR',
    name: 'Phòng Hành Chính Nhân Sự',
    description: 'Khối văn phòng nhân sự'
  });

  adminUser = await User.create({
    employee_code: 'ADM-001',
    full_name: 'Quản Trị Viên Hệ Thống',
    email: 'admin.hr@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    position: 'Trưởng bộ phận CNTT',
    phone: '0901234567',
    department_id: deptHr.id,
    hire_date: '2024-01-01',
    status: 'active'
  });

  managerUser = await User.create({
    employee_code: 'MGR-001',
    full_name: 'Nguyễn Quản Lý Sản Xuất',
    email: 'manager.prod@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    position: 'Quản đốc phân xưởng',
    phone: '0902345678',
    department_id: deptProd.id,
    hire_date: '2024-02-01',
    status: 'active'
  });

  employeeUser = await User.create({
    employee_code: 'EMP-001',
    full_name: 'Trần Công Nhân Cơ Khí',
    email: 'worker.prod@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    position: 'Thợ tiện CNC',
    phone: '0903456789',
    department_id: deptProd.id,
    hire_date: '2024-03-01',
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerCookie = createTokenCookie(managerUser);
  employeeCookie = createTokenCookie(employeeUser);
});

afterAll(async () => {
  await sequelize.close();
});

describe('Employee Directory API', () => {
  it('GET /api/employees returns paginated active employees', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Cookie', employeeCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(3);
    expect(Array.isArray(res.body.employees)).toBe(true);
    expect(res.body.employees.length).toBe(3);
  });

  it('GET /api/employees/:id returns single employee profile without password', async () => {
    const res = await request(app)
      .get(`/api/employees/${employeeUser.id}`)
      .set('Cookie', employeeCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.employee.employee_code).toBe('EMP-001');
    expect(res.body.employee.password).toBeUndefined();
    expect(res.body.employee.department.name).toBe('Phòng Sản Xuất');
  });
});

describe('GET /api/employees/export (CSV Export)', () => {
  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/employees/export');
    expect(res.status).toBe(401);
  });

  it('blocks regular employee role with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/employees/export')
      .set('Cookie', employeeCookie);

    expect(res.status).toBe(403);
  });

  it('allows admin to export all employees with UTF-8 BOM CSV', async () => {
    const res = await request(app)
      .get('/api/employees/export')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="employees-');

    const text = res.text;
    // Must start with UTF-8 BOM (\uFEFF)
    expect(text.startsWith('\uFEFF')).toBe(true);

    // Headers verification
    expect(text).toContain('"Mã nhân viên","Họ và tên","Email công việc","Số điện thoại","Mã phòng ban","Tên phòng ban","Chức vụ","Vai trò hệ thống","Ngày vào làm","Trạng thái","Ngày tạo hồ sơ"');

    // Content verification
    expect(text).toContain('ADM-001');
    expect(text).toContain('Quản Trị Viên Hệ Thống');
    expect(text).toContain('admin.hr@fusheng.com.vn');
    expect(text).toContain('MGR-001');
    expect(text).toContain('EMP-001');
  });

  it('filters export by search term', async () => {
    const res = await request(app)
      .get('/api/employees/export?search=Công Nhân')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain('EMP-001');
    expect(res.text).not.toContain('ADM-001');
  });

  it('filters export by department_id', async () => {
    const res = await request(app)
      .get(`/api/employees/export?department_id=${deptHr.id}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain('ADM-001');
    expect(res.text).not.toContain('EMP-001');
  });

  it('scopes manager export to their own managed department', async () => {
    const res = await request(app)
      .get('/api/employees/export')
      .set('Cookie', managerCookie);

    expect(res.status).toBe(200);
    // Manager is in PROD: should only see PROD department employees (MGR-001, EMP-001)
    expect(res.text).toContain('MGR-001');
    expect(res.text).toContain('EMP-001');
    // Must NOT contain HR department admin
    expect(res.text).not.toContain('ADM-001');
  });

  it('creates an audit log entry for employee export', async () => {
    const audit = await AuditLog.findOne({
      where: {
        action: 'employee.export',
        user_id: adminUser.id
      },
      order: [['created_at', 'DESC']]
    });

    expect(audit).not.toBeNull();
    expect(audit.entity_type).toBe('user');
  });
});


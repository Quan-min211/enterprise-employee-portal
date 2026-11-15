/**
 * Holidays Management & Calendar Integration Tests
 *
 * Covers:
 * 1. Role-based access control (Admin only for write operations, all roles for read).
 * 2. Default Vietnam national holidays seeding (seedDefaultHolidays) & idempotency.
 * 3. Holiday creation, date validation, and duplicate conflict handling (409 Conflict).
 * 4. Paranoid soft delete & restore capability upon re-creating same date.
 * 5. Update operations (name and holiday type).
 * 6. Business logic integration with LeaveRequest business day calculation.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, Holiday, LeaveRequest } from '../models/index.js';

let testDept = null;
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

  testDept = await Department.create({
    code: 'DEPT-HR',
    name: 'Phong Nhan Su',
    description: 'Phong quan ly nhan su va lich nghi'
  });

  adminUser = await User.create({
    employee_code: 'ADM-HOL-01',
    full_name: 'Quan Tri Vien Le',
    email: 'admin.hol@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    department_id: testDept.id,
    status: 'active'
  });

  managerUser = await User.create({
    employee_code: 'MGR-HOL-01',
    full_name: 'Quan Ly Nhan Su',
    email: 'mgr.hol@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: testDept.id,
    status: 'active'
  });

  employeeUser = await User.create({
    employee_code: 'EMP-HOL-01',
    full_name: 'Nhan Vien San Xuat',
    email: 'emp.hol@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: testDept.id,
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerCookie = createTokenCookie(managerUser);
  employeeCookie = createTokenCookie(employeeUser);
});

describe('GET /api/holidays (List holidays)', () => {
  it('blocks unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/holidays');
    expect(res.status).toBe(401);
  });

  it('rejects invalid year query with 400', async () => {
    const res = await request(app)
      .get('/api/holidays?year=2015')
      .set('Cookie', employeeCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('allows employee and manager to read holidays for current year', async () => {
    const resEmp = await request(app)
      .get('/api/holidays?year=2026')
      .set('Cookie', employeeCookie);

    expect(resEmp.status).toBe(200);
    expect(resEmp.body.success).toBe(true);
    expect(resEmp.body.year).toBe(2026);
    expect(Array.isArray(resEmp.body.holidays)).toBe(true);

    const resMgr = await request(app)
      .get('/api/holidays?year=2026')
      .set('Cookie', managerCookie);

    expect(resMgr.status).toBe(200);
    expect(resMgr.body.success).toBe(true);
  });
});

describe('POST /api/holidays/seed-defaults (Seed Vietnam national holidays)', () => {
  it('blocks non-admin users from seeding holidays (403)', async () => {
    const resEmp = await request(app)
      .post('/api/holidays/seed-defaults')
      .set('Cookie', employeeCookie);
    expect(resEmp.status).toBe(403);

    const resMgr = await request(app)
      .post('/api/holidays/seed-defaults')
      .set('Cookie', managerCookie);
    expect(resMgr.status).toBe(403);
  });

  it('allows admin to seed default 12 VN national holidays for 2026', async () => {
    const res = await request(app)
      .post('/api/holidays/seed-defaults')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.created).toBe(12);
    expect(res.body.skipped).toBe(0);

    // Verify all 12 are retrieved in chronological order
    const listRes = await request(app)
      .get('/api/holidays?year=2026')
      .set('Cookie', employeeCookie);

    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(12);
    expect(listRes.body.holidays[0].date).toBe('2026-01-01');
    expect(listRes.body.holidays[0].name).toBe('Tết Dương lịch');
  });

  it('demonstrates idempotency when run repeatedly (skips existing)', async () => {
    const res = await request(app)
      .post('/api/holidays/seed-defaults')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(0);
    expect(res.body.skipped).toBe(12);
  });
});

describe('POST /api/holidays (Create holiday)', () => {
  it('blocks non-admin from creating holiday (403)', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Cookie', employeeCookie)
      .send({
        date: '2026-10-10',
        name: 'Ngay Ky Niem Thanh Lap Nha May',
        type: 'company'
      });

    expect(res.status).toBe(403);
  });

  it('rejects invalid date format with 400', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Cookie', adminCookie)
      .send({
        date: 'invalid-date-format',
        name: 'Ngay le loi dinh dang'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects holiday with too short name (<2 chars) with 400', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Cookie', adminCookie)
      .send({
        date: '2026-10-10',
        name: 'A'
      });

    expect(res.status).toBe(400);
  });

  it('rejects invalid holiday type enum with 400', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Cookie', adminCookie)
      .send({
        date: '2026-10-10',
        name: 'Ngay Bao Tri Lo Nung',
        type: 'unsupported_type'
      });

    expect(res.status).toBe(400);
  });

  it('allows admin to create a valid company maintenance holiday (201)', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Cookie', adminCookie)
      .send({
        date: '2026-10-10',
        name: 'Bao Tri Toan Nha May Fu Sheng',
        type: 'maintenance'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.holiday.date).toBe('2026-10-10');
    expect(res.body.holiday.type).toBe('maintenance');
  });

  it('rejects duplicate holiday date with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Cookie', adminCookie)
      .send({
        date: '2026-10-10',
        name: 'Trung lap ngay bao tri',
        type: 'maintenance'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/da ton tai trong danh sach/i);
  });
});

describe('PUT /api/holidays/:id (Update holiday)', () => {
  let createdHolidayId = null;

  beforeAll(async () => {
    const created = await Holiday.findOne({ where: { date: '2026-10-10' } });
    createdHolidayId = created.id;
  });

  it('blocks non-admin from updating holiday (403)', async () => {
    const res = await request(app)
      .put(`/api/holidays/${createdHolidayId}`)
      .set('Cookie', employeeCookie)
      .send({ name: 'Sua boi nhan vien' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent holiday ID', async () => {
    const res = await request(app)
      .put('/api/holidays/999999')
      .set('Cookie', adminCookie)
      .send({ name: 'Khong ton tai' });

    expect(res.status).toBe(404);
  });

  it('allows admin to update name and holiday type (200)', async () => {
    const res = await request(app)
      .put(`/api/holidays/${createdHolidayId}`)
      .set('Cookie', adminCookie)
      .send({
        name: 'Bao Tri Dinh Ky Day Chuyen May Nen Khi',
        type: 'company'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.holiday.name).toBe('Bao Tri Dinh Ky Day Chuyen May Nen Khi');
    expect(res.body.holiday.type).toBe('company');
  });
});

describe('DELETE /api/holidays/:id & Soft-Delete Restoration', () => {
  let targetId = null;

  beforeAll(async () => {
    const h = await Holiday.findOne({ where: { date: '2026-10-10' } });
    targetId = h.id;
  });

  it('blocks non-admin from deleting holiday (403)', async () => {
    const res = await request(app)
      .delete(`/api/holidays/${targetId}`)
      .set('Cookie', managerCookie);

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent holiday ID', async () => {
    const res = await request(app)
      .delete('/api/holidays/999999')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
  });

  it('allows admin to soft delete holiday (200)', async () => {
    const res = await request(app)
      .delete(`/api/holidays/${targetId}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is excluded from active listings
    const listRes = await request(app)
      .get('/api/holidays?year=2026')
      .set('Cookie', employeeCookie);

    const exists = listRes.body.holidays.some((item) => item.date === '2026-10-10');
    expect(exists).toBe(false);

    // Verify it still exists in DB with deleted_at set (paranoid)
    const softDeleted = await Holiday.findOne({
      where: { id: targetId },
      paranoid: false
    });
    expect(softDeleted).not.toBeNull();
    expect(softDeleted.deleted_at).not.toBeNull();
  });

  it('restores soft-deleted holiday when admin recreates it with same date (200)', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Cookie', adminCookie)
      .send({
        date: '2026-10-10',
        name: 'Khoi Phuc Ngay Bao Tri Nha May',
        type: 'maintenance'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Khoi phuc ngay le/i);

    const restored = await Holiday.findOne({ where: { date: '2026-10-10' } });
    expect(restored).not.toBeNull();
    expect(restored.deleted_at).toBeNull();
    expect(restored.name).toBe('Khoi Phuc Ngay Bao Tri Nha May');
  });
});

describe('Integration: LeaveRequest business days exclusion with Holidays table', () => {
  it('automatically deducts seeded public holidays from business day calculation', async () => {
    // 2026-09-01 (Tue) to 2026-09-03 (Thu):
    // 2026-09-01: Tue (1.0 day)
    // 2026-09-02: Wed (0.0 day - National Day Quoc Khanh from seeded holidays)
    // 2026-09-03: Thu (1.0 day)
    // Expected calculated day_count = 2.0 (not 3.0)
    const res = await request(app)
      .post('/api/leaves')
      .set('Cookie', employeeCookie)
      .send({
        request_type: 'leave',
        leave_type: 'annual',
        start_date: '2026-09-01',
        end_date: '2026-09-03',
        reason: 'Nghi phep ket hop ngay Quoc Khanh de ve tham que'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.request.day_count)).toBe(2);
  });
});

/**
 * Dashboard Leave Balance Report Tests
 *
 * Verifies plant-wide, departmental, and personal aggregation of leave days
 * used vs remaining, annual entitlement, carried over days, utilization tiers,
 * role-based scoping (admin vs manager vs employee), and integration into dashboard summary.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, LeaveBalance } from '../models/index.js';

let deptProd = null;
let deptEng = null;
let deptHr = null;

let adminUser = null;
let managerProd = null;
let workerProd1 = null;
let workerProd2 = null;
let workerEng = null;

let adminCookie = null;
let managerProdCookie = null;
let workerProd1Cookie = null;

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
    description: 'Khối văn phòng HR'
  });

  adminUser = await User.create({
    employee_code: 'ADM-LB-01',
    full_name: 'Quản Trị Viên HR',
    email: 'admin.lb@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    department_id: deptHr.id,
    status: 'active'
  });

  managerProd = await User.create({
    employee_code: 'MGR-LB-01',
    full_name: 'Quản Đốc Sản Xuất',
    email: 'mgr.lb@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptProd.id,
    status: 'active'
  });

  workerProd1 = await User.create({
    employee_code: 'WRK-LB-01',
    full_name: 'Công Nhân Tiện CNC 1',
    email: 'worker.lb.1@fusheng.com.vn',
    password: await bcrypt.hash('Worker@123', 10),
    role: 'employee',
    department_id: deptProd.id,
    status: 'active'
  });

  workerProd2 = await User.create({
    employee_code: 'WRK-LB-02',
    full_name: 'Công Nhân Phay 2',
    email: 'worker.lb.2@fusheng.com.vn',
    password: await bcrypt.hash('Worker@123', 10),
    role: 'employee',
    department_id: deptProd.id,
    status: 'active'
  });

  workerEng = await User.create({
    employee_code: 'WRK-LB-03',
    full_name: 'Kỹ Sư Cơ Điện',
    email: 'worker.lb.3@fusheng.com.vn',
    password: await bcrypt.hash('Worker@123', 10),
    role: 'employee',
    department_id: deptEng.id,
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerProdCookie = createTokenCookie(managerProd);
  workerProd1Cookie = createTokenCookie(workerProd1);

  // Seed Leave Balances for 2026:
  // 1. Admin: 14 entitlement + 2 carry = 16 total. Used 4, remaining 12. Rate = 25.0% (medium)
  await LeaveBalance.create({
    user_id: adminUser.id,
    year: 2026,
    annual_entitlement: 14,
    carried_over_days: 2,
    used_days: 4,
    remaining_days: 12
  });

  // 2. Manager Prod: 12 entitlement + 0 carry = 12 total. Used 2, remaining 10. Rate = 16.7% (low)
  await LeaveBalance.create({
    user_id: managerProd.id,
    year: 2026,
    annual_entitlement: 12,
    carried_over_days: 0,
    used_days: 2,
    remaining_days: 10
  });

  // 3. Worker Prod 1: 12 entitlement + 0 carry = 12 total. Used 10, remaining 2. Rate = 83.3% (exhausted)
  await LeaveBalance.create({
    user_id: workerProd1.id,
    year: 2026,
    annual_entitlement: 12,
    carried_over_days: 0,
    used_days: 10,
    remaining_days: 2
  });

  // 4. Worker Prod 2: 12 entitlement + 0 carry = 12 total. Used 6, remaining 6. Rate = 50.0% (high)
  await LeaveBalance.create({
    user_id: workerProd2.id,
    year: 2026,
    annual_entitlement: 12,
    carried_over_days: 0,
    used_days: 6,
    remaining_days: 6
  });

  // 5. Worker Eng: 12 entitlement + 0 carry = 12 total. Used 0, remaining 12. Rate = 0% (low)
  await LeaveBalance.create({
    user_id: workerEng.id,
    year: 2026,
    annual_entitlement: 12,
    carried_over_days: 0,
    used_days: 0,
    remaining_days: 12
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/dashboard/leave-balances', () => {
  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/dashboard/leave-balances');
    expect(res.status).toBe(401);
  });

  it('validates year query with 400 if out of range', async () => {
    const res = await request(app)
      .get('/api/dashboard/leave-balances?year=2010')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('validates tier query with 400 if invalid enum value', async () => {
    const res = await request(app)
      .get('/api/dashboard/leave-balances?tier=unknown_tier')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns factory-wide leave balance statistics for admin', async () => {
    const res = await request(app)
      .get('/api/dashboard/leave-balances?year=2026')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.year).toBe(2026);
    expect(data.totalEmployees).toBe(5);

    // Total entitled: 16 (admin) + 12 (mgr) + 12 (wrk1) + 12 (wrk2) + 12 (eng) = 64
    expect(data.totalEntitledDays).toBe(64);
    // Total used: 4 + 2 + 10 + 6 + 0 = 22
    expect(data.totalUsedDays).toBe(22);
    // Total remaining: 12 + 10 + 2 + 6 + 12 = 42
    expect(data.totalRemainingDays).toBe(42);
    // Total carried: 2
    expect(data.totalCarriedOverDays).toBe(2);

    // Utilization rate = (22 / 64) * 100 = 34.4%
    expect(data.averageUtilizationRate).toBe(34.4);

    // Tiers check:
    // low (<25%): manager (16.7%), workerEng (0%) -> 2
    expect(data.tiers.low.count).toBe(2);
    // medium (25-50%): admin (25.0%) -> 1
    expect(data.tiers.medium.count).toBe(1);
    // high (50-75%): workerProd2 (50.0%) -> 1
    expect(data.tiers.high.count).toBe(1);
    // exhausted (>=75%): workerProd1 (83.3%) -> 1
    expect(data.tiers.exhausted.count).toBe(1);

    // Department summary present for admin
    expect(Array.isArray(data.departmentSummary)).toBe(true);
    expect(data.departmentSummary.length).toBeGreaterThanOrEqual(3);
  });

  it('scopes leave balance statistics to manager department', async () => {
    const res = await request(app)
      .get('/api/dashboard/leave-balances?year=2026')
      .set('Cookie', managerProdCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // Manager PROD manages 3 employees: managerProd, workerProd1, workerProd2
    expect(data.totalEmployees).toBe(3);
    // Total entitled: 12 + 12 + 12 = 36
    expect(data.totalEntitledDays).toBe(36);
    // Total used: 2 + 10 + 6 = 18
    expect(data.totalUsedDays).toBe(18);
    // Total remaining: 10 + 2 + 6 = 18
    expect(data.totalRemainingDays).toBe(18);
    // Rate = 50.0%
    expect(data.averageUtilizationRate).toBe(50.0);

    // Check manager department flag
    const prodDept = data.departmentSummary.find((d) => d.code === 'PROD');
    expect(prodDept).toBeDefined();
    expect(prodDept.isMyDepartment).toBe(true);
  });

  it('scopes leave balance statistics to individual employee record', async () => {
    const res = await request(app)
      .get('/api/dashboard/leave-balances?year=2026')
      .set('Cookie', workerProd1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.totalEmployees).toBe(1);
    expect(data.employees).toHaveLength(1);

    const workerRecord = data.employees[0];
    expect(workerRecord.fullName).toBe('Công Nhân Tiện CNC 1');
    expect(workerRecord.usedDays).toBe(10);
    expect(workerRecord.remainingDays).toBe(2);
    expect(workerRecord.utilizationRate).toBe(83.3);
    expect(workerRecord.isNearExhaustion).toBe(true);

    // Regular employee does not receive plant-wide department summary
    expect(data.departmentSummary).toHaveLength(0);
  });

  it('filters employees by tier (exhausted only)', async () => {
    const res = await request(app)
      .get('/api/dashboard/leave-balances?year=2026&tier=exhausted')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.filterTier).toBe('exhausted');
    // Only workerProd1 is exhausted (83.3%)
    expect(data.employees).toHaveLength(1);
    expect(data.employees[0].employeeCode).toBe('WRK-LB-01');
  });

  it('filters employees by department_id for admin', async () => {
    const res = await request(app)
      .get(`/api/dashboard/leave-balances?year=2026&department_id=${deptEng.id}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // ENG has 1 employee: workerEng
    expect(data.totalEmployees).toBe(1);
    expect(data.totalUsedDays).toBe(0);
    expect(data.totalRemainingDays).toBe(12);
    expect(data.averageUtilizationRate).toBe(0);
  });

  it('integrates leave balance stats directly into GET /api/dashboard/summary', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = res.body.summary;
    expect(summary.leaveBalanceStats).toBeDefined();
    expect(summary.leaveBalanceStats.year).toBe(new Date().getFullYear());
    expect(summary.leaveBalanceStats.totalEmployees).toBe(5);
    expect(summary.leaveBalanceStats.totalEntitledDays).toBe(64);
    expect(summary.leaveBalanceStats.totalRemainingDays).toBe(42);
  });
});


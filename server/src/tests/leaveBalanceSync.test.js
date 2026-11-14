/**
 * Leave Balance Deduction & Validation Integration Tests
 *
 * Verifies that:
 * 1. Submitting annual leave validates remaining balance and rejects if day_count > remaining_days (HTTP 400).
 * 2. Approving an annual leave request atomically deducts remaining_days and increments used_days in LeaveBalance.
 * 3. Approving sick leave or overtime does NOT deduct annual leave balance.
 * 4. Rejecting an annual leave request does NOT deduct leave balance.
 * 5. Department permission scoping is enforced on approval (HTTP 403 for cross-department manager).
 * 6. Cancelling pending leave updates status cleanly without balance side-effects.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, LeaveRequest, LeaveBalance, LeaveApprovalLog } from '../models/index.js';

let deptA = null;
let deptB = null;
let managerA = null;
let managerB = null;
let employeeA1 = null;
let employeeA2 = null;

let managerACookie = null;
let managerBCookie = null;
let employeeA1Cookie = null;
let employeeA2Cookie = null;

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

  deptA = await Department.create({
    code: 'DEPT-A',
    name: 'Xuong Co Dien A',
    description: 'Bo phan co dien xuyen suot nha may'
  });

  deptB = await Department.create({
    code: 'DEPT-B',
    name: 'Xuong Lap Rap B',
    description: 'Day chuyen lap rap dong co'
  });

  managerA = await User.create({
    employee_code: 'MGR-A-01',
    full_name: 'Quan Doc Xuong A',
    email: 'mgr.a@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptA.id,
    status: 'active'
  });

  managerB = await User.create({
    employee_code: 'MGR-B-01',
    full_name: 'Quan Doc Xuong B',
    email: 'mgr.b@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptB.id,
    status: 'active'
  });

  employeeA1 = await User.create({
    employee_code: 'EMP-A-01',
    full_name: 'Nguyen Van Thang',
    email: 'thang.nv@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: deptA.id,
    status: 'active'
  });

  employeeA2 = await User.create({
    employee_code: 'EMP-A-02',
    full_name: 'Tran Thi Mai',
    email: 'mai.tt@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: deptA.id,
    status: 'active'
  });

  managerACookie = createTokenCookie(managerA);
  managerBCookie = createTokenCookie(managerB);
  employeeA1Cookie = createTokenCookie(employeeA1);
  employeeA2Cookie = createTokenCookie(employeeA2);
});

describe('Leave Balance Verification upon Submission (POST /api/leaves)', () => {
  it('allows employee to submit annual leave when requested days <= remaining balance', async () => {
    // 2026-11-03 (Tue) to 2026-11-04 (Wed) = 2 business days
    const res = await request(app)
      .post('/api/leaves')
      .set('Cookie', employeeA1Cookie)
      .send({
        request_type: 'leave',
        leave_type: 'annual',
        start_date: '2026-11-03',
        end_date: '2026-11-04',
        reason: 'Xin nghi phep giai quyet viec gia dinh'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.request.status).toBe('pending');
    expect(Number(res.body.request.day_count)).toBe(2);

    // Verify balance was automatically initialized but NOT deducted yet (pending)
    const balance = await LeaveBalance.findOne({
      where: { user_id: employeeA1.id, year: 2026 }
    });
    expect(balance).not.toBeNull();
    expect(Number(balance.annual_entitlement)).toBe(12);
    expect(Number(balance.used_days)).toBe(0);
    expect(Number(balance.remaining_days)).toBe(12);
  });

  it('rejects annual leave request with 400 when day_count exceeds remaining balance', async () => {
    // Manually set employeeA2 balance to 1 day remaining
    await LeaveBalance.create({
      user_id: employeeA2.id,
      year: 2026,
      annual_entitlement: 12,
      used_days: 11,
      remaining_days: 1,
      carried_over_days: 0
    });

    // Request from 2026-11-02 (Mon) to 2026-11-04 (Wed) = 3 business days
    const res = await request(app)
      .post('/api/leaves')
      .set('Cookie', employeeA2Cookie)
      .send({
        request_type: 'leave',
        leave_type: 'annual',
        start_date: '2026-11-02',
        end_date: '2026-11-04',
        reason: 'Xin nghi phep 3 ngay nhung chi con 1 ngay phep'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/vượt quá số ngày phép còn lại/i);
    expect(res.body.balance).toBeDefined();
    expect(Number(res.body.balance.remaining_days)).toBe(1);
  });

  it('permits non-annual leave (unpaid / sick) even if remaining annual balance is exhausted', async () => {
    // employeeA2 has only 1 annual day remaining, but asks for 3 days unpaid
    const res = await request(app)
      .post('/api/leaves')
      .set('Cookie', employeeA2Cookie)
      .send({
        request_type: 'leave',
        leave_type: 'unpaid',
        start_date: '2026-11-02',
        end_date: '2026-11-04',
        reason: 'Xin nghi khong luong giai quyet viec ca nhan dot xuat'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.request.leave_type).toBe('unpaid');
  });
});

describe('Leave Balance Auto-Deduction upon Approval (PATCH /api/leaves/:id/status)', () => {
  it('deducts remaining_days and increments used_days when manager approves annual leave', async () => {
    // Find employeeA1's pending annual leave (2 days)
    const pendingRequest = await LeaveRequest.findOne({
      where: { user_id: employeeA1.id, status: 'pending', leave_type: 'annual' }
    });
    expect(pendingRequest).not.toBeNull();

    const res = await request(app)
      .patch(`/api/leaves/${pendingRequest.id}/status`)
      .set('Cookie', managerACookie)
      .send({
        status: 'approved',
        manager_comment: 'Dong y cho nghi phep 2 ngay'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.balance).toBeDefined();
    expect(Number(res.body.balance.used_days)).toBe(2);
    expect(Number(res.body.balance.remaining_days)).toBe(10);

    // Verify database state directly
    const balanceInDb = await LeaveBalance.findOne({
      where: { user_id: employeeA1.id, year: 2026 }
    });
    expect(Number(balanceInDb.used_days)).toBe(2);
    expect(Number(balanceInDb.remaining_days)).toBe(10);

    // Verify approval log record
    const log = await LeaveApprovalLog.findOne({
      where: { leave_request_id: pendingRequest.id }
    });
    expect(log).not.toBeNull();
    expect(log.actor_id).toBe(managerA.id);
    expect(log.from_status).toBe('pending');
    expect(log.to_status).toBe('approved');
    expect(log.comment).toBe('Dong y cho nghi phep 2 ngay');
  });

  it('does NOT alter annual leave balance when manager approves unpaid leave', async () => {
    const unpaidRequest = await LeaveRequest.findOne({
      where: { user_id: employeeA2.id, status: 'pending', leave_type: 'unpaid' }
    });
    expect(unpaidRequest).not.toBeNull();

    const res = await request(app)
      .patch(`/api/leaves/${unpaidRequest.id}/status`)
      .set('Cookie', managerACookie)
      .send({
        status: 'approved',
        manager_comment: 'Duyet nghi khong huong luong'
      });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');

    // Balance should remain 11 used, 1 remaining
    const balanceInDb = await LeaveBalance.findOne({
      where: { user_id: employeeA2.id, year: 2026 }
    });
    expect(Number(balanceInDb.used_days)).toBe(11);
    expect(Number(balanceInDb.remaining_days)).toBe(1);
  });

  it('does NOT deduct leave balance when request is rejected', async () => {
    // Create a 1-day leave for employeeA1
    const newRequest = await LeaveRequest.create({
      user_id: employeeA1.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-10',
      end_date: '2026-11-10',
      reason: 'Xin nghi 1 ngay nua nhung bi quan doc tu choi vi trung lich san xuat',
      day_count: 1,
      status: 'pending'
    });

    const res = await request(app)
      .patch(`/api/leaves/${newRequest.id}/status`)
      .set('Cookie', managerACookie)
      .send({
        status: 'rejected',
        manager_comment: 'Xuong dang co don hang gap, vui long dang ky vao dip khac'
      });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('rejected');

    // Balance remains 2 used, 10 remaining
    const balance = await LeaveBalance.findOne({
      where: { user_id: employeeA1.id, year: 2026 }
    });
    expect(Number(balance.used_days)).toBe(2);
    expect(Number(balance.remaining_days)).toBe(10);
  });

  it('blocks manager from approving leave requests of employees in another department (403)', async () => {
    const crossDeptRequest = await LeaveRequest.create({
      user_id: employeeA1.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-16',
      end_date: '2026-11-16',
      reason: 'Kiem thu phan quyen duyet cheo phong ban',
      day_count: 1,
      status: 'pending'
    });

    // Manager B belongs to Dept B, whereas employeeA1 belongs to Dept A
    const res = await request(app)
      .patch(`/api/leaves/${crossDeptRequest.id}/status`)
      .set('Cookie', managerBCookie)
      .send({ status: 'approved' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows employee to cancel their own pending leave request cleanly', async () => {
    const cancelCandidate = await LeaveRequest.create({
      user_id: employeeA1.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-20',
      end_date: '2026-11-20',
      reason: 'Don dang cho duyet nhung nhan vien muon tu huy',
      day_count: 1,
      status: 'pending'
    });

    const res = await request(app)
      .patch(`/api/leaves/${cancelCandidate.id}/cancel`)
      .set('Cookie', employeeA1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.request.status).toBe('cancelled');

    // Balance should remain unchanged
    const balance = await LeaveBalance.findOne({
      where: { user_id: employeeA1.id, year: 2026 }
    });
    expect(Number(balance.used_days)).toBe(2);
    expect(Number(balance.remaining_days)).toBe(10);
  });
});


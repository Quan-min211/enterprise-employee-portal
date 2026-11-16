/**
 * Leave Approval Logs Integration & Foreign Key Tests
 *
 * Verifies that:
 * 1. GET /api/leaves/:id/logs requires authentication (401) and validates parameters (400, 404).
 * 2. Role-based scoping:
 *    - Employees can only view logs of their own requests (403 for others).
 *    - Managers can only view logs of requests in their department (403 for others).
 *    - Admins can view logs of all requests.
 * 3. Approving a request generates a LeaveApprovalLog record with actor and comment.
 * 4. Rejecting a request generates a LeaveApprovalLog record.
 * 5. Cancelling a request generates a LeaveApprovalLog record.
 * 6. Foreign key ON DELETE CASCADE: deleting a LeaveRequest cascades to delete its approval logs.
 * 7. Foreign key ON DELETE SET NULL: deleting an actor User sets actor_id to null while preserving logs.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import { sequelize } from '../config/database.js';
import { Department, User, LeaveRequest, LeaveApprovalLog } from '../models/index.js';

let deptA = null;
let deptB = null;
let adminUser = null;
let managerA = null;
let managerB = null;
let employeeA1 = null;
let employeeB1 = null;

let adminCookie = null;
let managerACookie = null;
let managerBCookie = null;
let employeeA1Cookie = null;
let employeeB1Cookie = null;

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
    code: 'DEPT-LOG-A',
    name: 'Phòng Kỹ Thuật A',
    description: 'Bo phan ky thuat he thong A'
  });

  deptB = await Department.create({
    code: 'DEPT-LOG-B',
    name: 'Phòng San Xuat B',
    description: 'Bo phan san xuat B'
  });

  adminUser = await User.create({
    employee_code: 'ADM-LOG-01',
    full_name: 'Quan Tri Vien He Thong',
    email: 'admin.log@fusheng.com.vn',
    password: await bcrypt.hash('Admin@123', 10),
    role: 'admin',
    department_id: deptA.id,
    status: 'active'
  });

  managerA = await User.create({
    employee_code: 'MGR-LOG-A',
    full_name: 'Quan Doc Xuong A',
    email: 'mgr.log.a@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptA.id,
    status: 'active'
  });

  managerB = await User.create({
    employee_code: 'MGR-LOG-B',
    full_name: 'Quan Doc Xuong B',
    email: 'mgr.log.b@fusheng.com.vn',
    password: await bcrypt.hash('Manager@123', 10),
    role: 'manager',
    department_id: deptB.id,
    status: 'active'
  });

  employeeA1 = await User.create({
    employee_code: 'EMP-LOG-A1',
    full_name: 'Nguyen Van An',
    email: 'an.nv@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: deptA.id,
    status: 'active'
  });

  employeeB1 = await User.create({
    employee_code: 'EMP-LOG-B1',
    full_name: 'Tran Thi Binh',
    email: 'binh.tt@fusheng.com.vn',
    password: await bcrypt.hash('Employee@123', 10),
    role: 'employee',
    department_id: deptB.id,
    status: 'active'
  });

  adminCookie = createTokenCookie(adminUser);
  managerACookie = createTokenCookie(managerA);
  managerBCookie = createTokenCookie(managerB);
  employeeA1Cookie = createTokenCookie(employeeA1);
  employeeB1Cookie = createTokenCookie(employeeB1);
});

describe('GET /api/leaves/:id/logs (Access Control & Validation)', () => {
  let sampleLeaveId = null;

  beforeAll(async () => {
    const leave = await LeaveRequest.create({
      user_id: employeeA1.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-20',
      end_date: '2026-11-21',
      reason: 'Xin nghi phep 2 ngay de giai quyet viec rieng',
      day_count: 2,
      status: 'pending'
    });
    sampleLeaveId = leave.id;
  });

  it('blocks unauthenticated requests with 401', async () => {
    const res = await request(app).get(`/api/leaves/${sampleLeaveId}/logs`);
    expect(res.status).toBe(401);
  });

  it('rejects invalid leave ID with 400', async () => {
    const res = await request(app)
      .get('/api/leaves/abc/logs')
      .set('Cookie', employeeA1Cookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for non-existent leave ID', async () => {
    const res = await request(app)
      .get('/api/leaves/999999/logs')
      .set('Cookie', employeeA1Cookie);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns empty logs array when leave is freshly submitted without status transitions', async () => {
    const res = await request(app)
      .get(`/api/leaves/${sampleLeaveId}/logs`)
      .set('Cookie', employeeA1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(0);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  it('blocks employee from viewing logs of another employee request (403)', async () => {
    const res = await request(app)
      .get(`/api/leaves/${sampleLeaveId}/logs`)
      .set('Cookie', employeeB1Cookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/khong co quyen xem lich su don cua nguoi khac/i);
  });

  it('blocks manager from viewing logs of an employee in another department (403)', async () => {
    // managerB belongs to deptB; sampleLeaveId belongs to employeeA1 (deptA)
    const res = await request(app)
      .get(`/api/leaves/${sampleLeaveId}/logs`)
      .set('Cookie', managerBCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/khong co quyen xem lich su don cua phong ban khac/i);
  });

  it('allows manager of the same department to view logs (200)', async () => {
    const res = await request(app)
      .get(`/api/leaves/${sampleLeaveId}/logs`)
      .set('Cookie', managerACookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('allows admin to view logs of any request (200)', async () => {
    const res = await request(app)
      .get(`/api/leaves/${sampleLeaveId}/logs`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Leave Approval Logs Life Cycle (Approve, Reject, Cancel)', () => {
  it('creates an approval log when manager approves a leave request', async () => {
    const leave = await LeaveRequest.create({
      user_id: employeeA1.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-23',
      end_date: '2026-11-24',
      reason: 'Xin nghi phep nam dot 2',
      day_count: 2,
      status: 'pending'
    });

    // Manager approves
    const approveRes = await request(app)
      .patch(`/api/leaves/${leave.id}/status`)
      .set('Cookie', managerACookie)
      .send({
        status: 'approved',
        manager_comment: 'Dong y cho phep nghi 2 ngay'
      });

    expect(approveRes.status).toBe(200);

    // Fetch logs
    const logRes = await request(app)
      .get(`/api/leaves/${leave.id}/logs`)
      .set('Cookie', employeeA1Cookie);

    expect(logRes.status).toBe(200);
    expect(logRes.body.total).toBe(1);

    const log = logRes.body.logs[0];
    expect(log.from_status).toBe('pending');
    expect(log.to_status).toBe('approved');
    expect(log.comment).toBe('Dong y cho phep nghi 2 ngay');
    expect(log.actor).toBeDefined();
    expect(log.actor.id).toBe(managerA.id);
    expect(log.actor.full_name).toBe(managerA.full_name);
    expect(log.actor.role).toBe('manager');
  });

  it('creates a rejection log when manager rejects a leave request', async () => {
    const leave = await LeaveRequest.create({
      user_id: employeeA1.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-25',
      end_date: '2026-11-25',
      reason: 'Xin nghi phep 1 ngay nua',
      day_count: 1,
      status: 'pending'
    });

    const rejectRes = await request(app)
      .patch(`/api/leaves/${leave.id}/status`)
      .set('Cookie', managerACookie)
      .send({
        status: 'rejected',
        manager_comment: 'Trung lich bao tri xuong, khong the duyet'
      });

    expect(rejectRes.status).toBe(200);

    const logRes = await request(app)
      .get(`/api/leaves/${leave.id}/logs`)
      .set('Cookie', employeeA1Cookie);

    expect(logRes.status).toBe(200);
    expect(logRes.body.total).toBe(1);

    const log = logRes.body.logs[0];
    expect(log.from_status).toBe('pending');
    expect(log.to_status).toBe('rejected');
    expect(log.comment).toBe('Trung lich bao tri xuong, khong the duyet');
  });

  it('creates a cancellation log when employee cancels their own pending leave request', async () => {
    const leave = await LeaveRequest.create({
      user_id: employeeA1.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-11-27',
      end_date: '2026-11-27',
      reason: 'Don se duoc tu huy boi nhan vien',
      day_count: 1,
      status: 'pending'
    });

    const cancelRes = await request(app)
      .patch(`/api/leaves/${leave.id}/cancel`)
      .set('Cookie', employeeA1Cookie);

    expect(cancelRes.status).toBe(200);

    const logRes = await request(app)
      .get(`/api/leaves/${leave.id}/logs`)
      .set('Cookie', employeeA1Cookie);

    expect(logRes.status).toBe(200);
    expect(logRes.body.total).toBe(1);

    const log = logRes.body.logs[0];
    expect(log.from_status).toBe('pending');
    expect(log.to_status).toBe('cancelled');
    expect(log.comment).toBe('Nguoi nop don tu huy.');
    expect(log.actor.id).toBe(employeeA1.id);
  });
});

describe('Database Foreign Key Constraints Verification', () => {
  it('cascades delete: deleting a LeaveRequest removes its LeaveApprovalLog records', async () => {
    const leave = await LeaveRequest.create({
      user_id: employeeA1.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-12-01',
      end_date: '2026-12-01',
      reason: 'Kiem thu rang buoc CASCADE xoa don',
      day_count: 1,
      status: 'pending'
    });

    await LeaveApprovalLog.create({
      leave_request_id: leave.id,
      actor_id: managerA.id,
      from_status: 'pending',
      to_status: 'approved',
      comment: 'Log kiem thu'
    });

    const logsBefore = await LeaveApprovalLog.findAll({
      where: { leave_request_id: leave.id }
    });
    expect(logsBefore.length).toBe(1);

    // Hard-destroy the leave request
    await leave.destroy({ force: true });

    // The logs associated with this leave_request_id should be cascade-deleted
    const logsAfter = await LeaveApprovalLog.findAll({
      where: { leave_request_id: leave.id }
    });
    expect(logsAfter.length).toBe(0);
  });

  it('sets actor_id to null when the actor user is deleted (ON DELETE SET NULL)', async () => {
    const tempManager = await User.create({
      employee_code: 'TEMP-MGR-01',
      full_name: 'Quan Ly Tam Thoi',
      email: 'temp.mgr@fusheng.com.vn',
      password: await bcrypt.hash('Temp@123', 10),
      role: 'manager',
      department_id: deptA.id,
      status: 'active'
    });

    const leave = await LeaveRequest.create({
      user_id: employeeA1.id,
      request_type: 'leave',
      leave_type: 'annual',
      start_date: '2026-12-05',
      end_date: '2026-12-05',
      reason: 'Kiem thu rang buoc SET NULL khi xoa user',
      day_count: 1,
      status: 'pending'
    });

    const log = await LeaveApprovalLog.create({
      leave_request_id: leave.id,
      actor_id: tempManager.id,
      from_status: 'pending',
      to_status: 'approved',
      comment: 'Duyet boi quan ly sap nghi viec'
    });

    expect(log.actor_id).toBe(tempManager.id);

    // Hard-destroy the actor user
    await tempManager.destroy({ force: true });

    // Reload the approval log from DB
    await log.reload();
    expect(log.actor_id).toBeNull();
    expect(log.comment).toBe('Duyet boi quan ly sap nghi viec');
  });
});

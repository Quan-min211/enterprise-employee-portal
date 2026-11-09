/**
 * Soft Delete & Status Verification Tests
 *
 * Verifies that core business entities support paranoid soft-deletion (deleted_at),
 * status flags, and proper restoration to preserve history and compliance audit trails.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';
import {
  Department,
  Announcement,
  Holiday,
  User,
  LeaveRequest,
  LeaveBalance
} from '../models/index.js';

let testUser = null;
let testDept = null;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testDept = await Department.create({
    code: 'PROD_SD',
    name: 'San Xuat Soft Delete',
    description: 'Phong ban kiem thu xoa mem',
    status: 'active'
  });

  testUser = await User.create({
    employee_code: 'SD-001',
    full_name: 'Nguyen Van Soft Delete',
    email: 'sd.user@fusheng.com.vn',
    password: await bcrypt.hash('Test@123', 10),
    role: 'employee',
    department_id: testDept.id,
    status: 'active'
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Paranoid Soft Delete & Status Architecture', () => {
  describe('Department model', () => {
    it('creates department with default active status and null deleted_at', async () => {
      const dept = await Department.create({
        code: 'QC_SD',
        name: 'Kiem Soat Chat Luong SD'
      });

      expect(dept.status).toBe('active');
      expect(dept.deleted_at ?? null).toBeNull();
    });

    it('soft deletes department without removing row from database', async () => {
      const dept = await Department.create({
        code: 'TEMP_SD',
        name: 'Phong Ban Tam Thoi'
      });
      const deptId = dept.id;

      // Soft delete
      await dept.destroy();

      // Standard query must NOT find the soft-deleted department
      const activeDepts = await Department.findAll({ where: { id: deptId } });
      expect(activeDepts.length).toBe(0);

      // Paranoid false query MUST find the preserved historical record
      const preservedDept = await Department.findByPk(deptId, { paranoid: false });
      expect(preservedDept).not.toBeNull();
      expect(preservedDept.deleted_at).not.toBeNull();
      expect(preservedDept.deleted_at instanceof Date).toBe(true);

      // Restore department
      await preservedDept.restore();
      const restoredDept = await Department.findByPk(deptId);
      expect(restoredDept).not.toBeNull();
      expect(restoredDept.deleted_at ?? null).toBeNull();
    });
  });

  describe('Announcement model', () => {
    it('creates announcement with default published status and soft deletes cleanly', async () => {
      const announcement = await Announcement.create({
        title: 'Thong bao bao tri day chuyen dap',
        content: 'Toan bo may nen khi khu vuc B tam ngung tu 18h00.',
        priority: 'urgent',
        author_id: testUser.id
      });

      expect(announcement.status).toBe('published');
      expect(announcement.deleted_at ?? null).toBeNull();

      const annId = announcement.id;
      await announcement.destroy();

      // Standard query hides it
      const activeList = await Announcement.findAll({ where: { id: annId } });
      expect(activeList.length).toBe(0);

      // Historical query preserves it
      const historical = await Announcement.findByPk(annId, { paranoid: false });
      expect(historical).not.toBeNull();
      expect(historical.deleted_at).not.toBeNull();
    });

    it('supports archiving announcement via status without deleting', async () => {
      const announcement = await Announcement.create({
        title: 'Chinh sach nghi mat 2026',
        content: 'Thong tin chi tiet chuyen du lich Da Lat.',
        author_id: testUser.id,
        status: 'published'
      });

      await announcement.update({ status: 'archived' });
      expect(announcement.status).toBe('archived');
      expect(announcement.deleted_at ?? null).toBeNull();
    });
  });

  describe('Holiday model', () => {
    it('soft deletes holiday and preserves historical date reference', async () => {
      const holiday = await Holiday.create({
        date: '2026-12-31',
        name: 'Ngay tong ket nam nha may Fu Sheng',
        type: 'company'
      });

      const holidayId = holiday.id;
      await holiday.destroy();

      const activeHolidays = await Holiday.findAll({ where: { id: holidayId } });
      expect(activeHolidays.length).toBe(0);

      const historicalHoliday = await Holiday.findByPk(holidayId, { paranoid: false });
      expect(historicalHoliday).not.toBeNull();
      expect(historicalHoliday.deleted_at).not.toBeNull();
    });
  });

  describe('User model', () => {
    it('soft deletes user and keeps foreign keys intact for historical reports', async () => {
      const user = await User.create({
        employee_code: 'SD-099',
        full_name: 'Tran Van Nghi Viec',
        email: 'retired.employee@fusheng.com.vn',
        password: await bcrypt.hash('Test@123', 10),
        role: 'employee',
        department_id: testDept.id,
        status: 'inactive'
      });

      const userId = user.id;
      await user.destroy();

      const activeUsers = await User.findAll({ where: { id: userId } });
      expect(activeUsers.length).toBe(0);

      const preservedUser = await User.findByPk(userId, { paranoid: false });
      expect(preservedUser).not.toBeNull();
      expect(preservedUser.deleted_at).not.toBeNull();
      expect(preservedUser.employee_code).toBe('SD-099');
    });
  });

  describe('LeaveRequest & LeaveBalance models', () => {
    it('soft deletes leave request and balance without cascading loss of audit data', async () => {
      const leave = await LeaveRequest.create({
        user_id: testUser.id,
        request_type: 'leave',
        leave_type: 'annual',
        start_date: '2026-06-01',
        end_date: '2026-06-02',
        reason: 'Nghi viec rieng gia dinh',
        day_count: 2.0,
        status: 'approved'
      });

      const balance = await LeaveBalance.create({
        user_id: testUser.id,
        year: 2026,
        annual_entitlement: 12,
        used_days: 2,
        remaining_days: 10,
        carried_over_days: 0
      });

      const leaveId = leave.id;
      const balanceId = balance.id;

      await leave.destroy();
      await balance.destroy();

      expect(await LeaveRequest.findByPk(leaveId)).toBeNull();
      expect(await LeaveBalance.findByPk(balanceId)).toBeNull();

      const preservedLeave = await LeaveRequest.findByPk(leaveId, { paranoid: false });
      const preservedBalance = await LeaveBalance.findByPk(balanceId, { paranoid: false });

      expect(preservedLeave).not.toBeNull();
      expect(preservedLeave.deleted_at).not.toBeNull();

      expect(preservedBalance).not.toBeNull();
      expect(preservedBalance.deleted_at).not.toBeNull();
    });
  });
});


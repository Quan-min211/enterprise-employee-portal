import { Department } from './Department.js';
import { User } from './User.js';
import { LeaveRequest } from './LeaveRequest.js';
import { LeaveBalance } from './LeaveBalance.js';
import { LeaveApprovalLog } from './LeaveApprovalLog.js';
import { Holiday } from './Holiday.js';
import { Announcement } from './Announcement.js';
import { AuditLog } from './AuditLog.js';

// ─── Department - User ────────────────────────────────────────────────────────
Department.hasMany(User, { foreignKey: 'department_id', as: 'employees', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Department manager (optional FK added in migration 002)
Department.belongsTo(User, { foreignKey: 'manager_id', as: 'manager', constraints: false });
User.hasMany(Department, { foreignKey: 'manager_id', as: 'managed_departments', constraints: false });

// ─── User - LeaveRequest ──────────────────────────────────────────────────────
User.hasMany(LeaveRequest, { foreignKey: 'user_id', as: 'leave_requests', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
LeaveRequest.belongsTo(User, { foreignKey: 'user_id', as: 'applicant' });

User.hasMany(LeaveRequest, { foreignKey: 'approver_id', as: 'approved_requests', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
LeaveRequest.belongsTo(User, { foreignKey: 'approver_id', as: 'approver' });

// ─── LeaveRequest - LeaveApprovalLog ─────────────────────────────────────────
LeaveRequest.hasMany(LeaveApprovalLog, { foreignKey: 'leave_request_id', as: 'approval_logs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
LeaveApprovalLog.belongsTo(LeaveRequest, { foreignKey: 'leave_request_id', as: 'leave_request' });

User.hasMany(LeaveApprovalLog, { foreignKey: 'actor_id', as: 'approval_actions', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
LeaveApprovalLog.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });

// ─── User - LeaveBalance ──────────────────────────────────────────────────────
User.hasMany(LeaveBalance, { foreignKey: 'user_id', as: 'leave_balances', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
LeaveBalance.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── User - Announcement ─────────────────────────────────────────────────────
User.hasMany(Announcement, { foreignKey: 'author_id', as: 'announcements', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Announcement.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// ─── User - AuditLog ─────────────────────────────────────────────────────────
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'actor' });

export {
  Department,
  User,
  LeaveRequest,
  LeaveBalance,
  LeaveApprovalLog,
  Holiday,
  Announcement,
  AuditLog
};

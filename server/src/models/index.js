import { Department } from './Department.js';
import { User } from './User.js';
import { LeaveRequest } from './LeaveRequest.js';
import { Announcement } from './Announcement.js';
import { AuditLog } from './AuditLog.js';

// Department - User associations (One-to-Many)
Department.hasMany(User, { foreignKey: 'department_id', as: 'employees', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// User - LeaveRequest associations
User.hasMany(LeaveRequest, { foreignKey: 'user_id', as: 'leave_requests', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
LeaveRequest.belongsTo(User, { foreignKey: 'user_id', as: 'applicant' });

User.hasMany(LeaveRequest, { foreignKey: 'approver_id', as: 'approved_requests', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
LeaveRequest.belongsTo(User, { foreignKey: 'approver_id', as: 'approver' });

// User - Announcement associations
User.hasMany(Announcement, { foreignKey: 'author_id', as: 'announcements', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Announcement.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// User - AuditLog associations
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'actor' });

export {
  Department,
  User,
  LeaveRequest,
  Announcement,
  AuditLog
};

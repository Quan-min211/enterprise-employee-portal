import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const LeaveApprovalLog = sequelize.define('LeaveApprovalLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  from_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false
  },
  to_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'leave_approval_logs',
  indexes: [
    { fields: ['leave_request_id'], name: 'idx_approval_log_leave_id' }
  ]
});

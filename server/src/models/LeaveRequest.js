import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const LeaveRequest = sequelize.define('LeaveRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  request_type: {
    type: DataTypes.ENUM('leave', 'overtime'),
    defaultValue: 'leave',
    allowNull: false
  },
  leave_type: {
    type: DataTypes.ENUM('annual', 'sick', 'unpaid', 'overtime', 'other'),
    defaultValue: 'annual',
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  day_count: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  manager_comment: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'leave_requests'
});

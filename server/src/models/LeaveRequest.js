import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const LeaveRequest = sequelize.define('LeaveRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  leave_type: {
    type: DataTypes.ENUM('annual', 'sick', 'unpaid', 'other'),
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

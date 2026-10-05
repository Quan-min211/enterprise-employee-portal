import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const LeaveBalance = sequelize.define('LeaveBalance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 2020, max: 2100 }
  },
  annual_entitlement: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 12,
    allowNull: false
  },
  used_days: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    allowNull: false
  },
  remaining_days: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 12,
    allowNull: false
  },
  carried_over_days: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    allowNull: false
  }
}, {
  tableName: 'leave_balances',
  indexes: [
    { unique: true, fields: ['user_id', 'year'], name: 'uq_leave_balance_user_year' }
  ]
});

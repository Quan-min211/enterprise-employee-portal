import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'employee'),
    defaultValue: 'employee',
    allowNull: false
  },
  position: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  hire_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['department_id', 'status'], name: 'idx_users_dept_status' },
    { fields: ['role'], name: 'idx_users_role' },
    { fields: ['status'], name: 'idx_users_status' }
  ]
});

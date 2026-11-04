import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  manager_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false
  }
  // manager_id FK is defined via association in models/index.js (added in migration 002)
}, {
  tableName: 'departments',
  paranoid: true,
  deletedAt: 'deleted_at',
  indexes: [
    { fields: ['status'], name: 'idx_departments_status' },
    { fields: ['deleted_at'], name: 'idx_departments_deleted_at' }
  ]
});

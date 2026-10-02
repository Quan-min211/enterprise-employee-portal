import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  action: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  entity_type: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  indexes: [
    { fields: ['action'], name: 'idx_auditlog_action' },
    { fields: ['created_at'], name: 'idx_auditlog_created_at' },
    { fields: ['user_id'], name: 'idx_auditlog_user_id' }
  ]
});

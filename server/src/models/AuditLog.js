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
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  request_id: {
    type: DataTypes.STRING(64),
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  indexes: [
    { fields: ['action'], name: 'idx_auditlog_action' },
    { fields: ['created_at'], name: 'idx_auditlog_created_at' },
    { fields: ['user_id'], name: 'idx_auditlog_user_id' },
    { fields: ['request_id'], name: 'idx_auditlog_request_id' },
    { fields: ['ip_address'], name: 'idx_auditlog_ip' }
  ]
});

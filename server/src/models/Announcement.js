import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('normal', 'important', 'urgent'),
    defaultValue: 'normal',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('published', 'archived'),
    defaultValue: 'published',
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'announcements',
  paranoid: true,
  deletedAt: 'deleted_at',
  indexes: [
    { fields: ['priority'], name: 'idx_announcements_priority' },
    { fields: ['priority', 'created_at'], name: 'idx_announcements_priority_created_at' },
    { fields: ['status'], name: 'idx_announcements_status' },
    { fields: ['deleted_at'], name: 'idx_announcements_deleted_at' }
  ]
});

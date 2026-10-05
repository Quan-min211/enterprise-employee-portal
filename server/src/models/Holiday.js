import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Holiday = sequelize.define('Holiday', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('national', 'company', 'maintenance'),
    defaultValue: 'national',
    allowNull: false
  }
}, {
  tableName: 'holidays',
  indexes: [
    { fields: ['date'], name: 'idx_holidays_date' }
  ]
});

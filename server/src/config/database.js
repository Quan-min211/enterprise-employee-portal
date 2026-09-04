import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'eep_db',
  process.env.DB_USER || 'eep_user',
  process.env.DB_PASSWORD || 'eep_secret_change_me',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

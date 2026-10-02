import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isCloudDb = Boolean(
  process.env.DB_SSL === 'true' ||
  (isProduction && process.env.DB_HOST && !['localhost', '127.0.0.1', 'db'].includes(process.env.DB_HOST)) ||
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'))
);

const dialectOptions = isCloudDb
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  : {};

const commonOptions = {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions,
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
};

export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, commonOptions)
  : new Sequelize(
      process.env.DB_NAME || 'eep_db',
      process.env.DB_USER || 'eep_user',
      process.env.DB_PASSWORD || 'eep_secret_change_me',
      {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        ...commonOptions
      }
    );


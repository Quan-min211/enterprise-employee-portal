import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { sequelize } from './src/config/database.js';
import routes from './src/routes/index.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { AppError } from './src/utils/AppError.js';
import { requestId } from './src/middleware/requestId.js';
import { seedDatabase } from './src/config/seed.js';
import { csrfProtection } from './src/middleware/csrf.js';

dotenv.config({ path: '../.env' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy (Render, Koyeb, Railway, Vercel, Cloudflare, Nginx)
app.set('trust proxy', 1);

const isTestEnv = process.env.NODE_ENV === 'test';

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  skip: () => isTestEnv,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  skip: () => isTestEnv,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Qua nhieu lan dang nhap. Vui long thu lai sau 1 phut.' }
});

// Configure CORS origin(s)
const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
  : ['http://localhost:5173'];

app.use(helmet());
app.use(requestId);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow vercel preview deployments if CLIENT_URL has vercel.app
    if (configuredOrigins.some((allowed) => allowed.includes('vercel.app') && origin.endsWith('.vercel.app'))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-XSRF-Token', 'X-Request-Id'],
  exposedHeaders: ['X-CSRF-Token', 'X-XSRF-Token', 'X-Request-Id']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);
app.use('/api', csrfProtection);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    system: 'Enterprise Employee Portal API',
    organization: 'Fu Sheng Industrial (Vietnam) Co., Ltd.',
    environment: process.env.NODE_ENV || 'development',
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
});

app.use('/api', routes);

// Catch-all handler for unmatched routes
app.use((req, res, next) => {
  next(new AppError(`Đường dẫn API ${req.method} ${req.originalUrl} không tồn tại.`, 404, 'NOT_FOUND'));
});

app.use(errorHandler);

let serverInstance = null;

export const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL database connected successfully.');

    if (process.env.DB_SYNC !== 'false') {
      await sequelize.sync({ alter: process.env.DB_SYNC_ALTER !== 'false' });
      console.log('Database models synchronized.');
    }

    if (process.env.DB_SEED !== 'false') {
      await seedDatabase();
      console.log('Seed data ensured.');
    }

    serverInstance = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

const handleShutdown = async (signal) => {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  if (serverInstance) {
    serverInstance.close(async () => {
      console.log('HTTP server closed.');
      try {
        await sequelize.close();
        console.log('Sequelize database connection closed.');
      } catch (err) {
        console.error('Error closing database connection:', err);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  startServer();
}

export default app;

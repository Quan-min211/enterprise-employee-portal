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
import { seedDatabase } from './src/config/seed.js';

dotenv.config({ path: '../.env' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Qua nhieu lan dang nhap. Vui long thu lai sau 1 phut.' }
});

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    system: 'Enterprise Employee Portal API',
    organization: 'Fu Sheng Industrial (Vietnam) Co., Ltd.',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', routes);
app.use(errorHandler);

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

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  startServer();
}

export default app;

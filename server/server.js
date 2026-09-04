import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { sequelize } from './src/config/database.js';
import routes from './src/routes/index.js';
import { errorHandler } from './src/middleware/errorHandler.js';

dotenv.config({ path: '../.env' });
dotenv.config(); // fallback to local .env

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    system: 'Enterprise Employee Portal API',
    organization: 'Fu Sheng Industrial (Vietnam) Co., Ltd.',
    timestamp: new Date().toISOString()
  });
});

// Main API Routes
app.use('/api', routes);

// Centralized Error Handler
app.use(errorHandler);

// Database Sync and Server Startup
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Database connected successfully.');

    // Auto-sync schema in development
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

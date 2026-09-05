import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/summary', verifyToken, getDashboardSummary);

export default router;

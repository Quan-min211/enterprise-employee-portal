import { Router } from 'express';
import { query } from 'express-validator';
import { getDashboardSummary, getMonthlyRequests } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get('/summary', verifyToken, getDashboardSummary);

router.get(
  '/monthly-requests',
  verifyToken,
  [
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2100 })
      .withMessage('Năm thống kê không hợp lệ (2020 - 2100).'),
    query('department_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Mã phòng ban không hợp lệ.')
  ],
  validateRequest,
  getMonthlyRequests
);

export default router;

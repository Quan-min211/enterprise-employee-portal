import { Router } from 'express';
import { query } from 'express-validator';
import {
  getMonthlySummary,
  exportMonthlySummary
} from '../controllers/reportController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

const summaryValidators = [
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2100 })
    .withMessage('Năm thống kê không hợp lệ (2020 - 2100).'),
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Tháng báo cáo không hợp lệ (1 - 12).'),
  query('department_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Mã phòng ban không hợp lệ.')
];

/**
 * GET /api/reports/monthly-summary
 * Xem tổng hợp số liệu báo cáo định kỳ theo tháng/năm dạng JSON (Admin, Manager)
 */
router.get(
  '/monthly-summary',
  verifyToken,
  checkRole(['admin', 'manager']),
  summaryValidators,
  validateRequest,
  getMonthlySummary
);

/**
 * GET /api/reports/monthly-summary/export
 * Xuất file CSV báo cáo định kỳ theo tháng/năm có UTF-8 BOM (Admin, Manager)
 */
router.get(
  '/monthly-summary/export',
  verifyToken,
  checkRole(['admin', 'manager']),
  summaryValidators,
  validateRequest,
  exportMonthlySummary
);

export default router;


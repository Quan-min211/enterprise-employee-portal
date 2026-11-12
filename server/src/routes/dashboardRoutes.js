import { Router } from 'express';
import { query } from 'express-validator';
import {
  getDashboardSummary,
  getMonthlyRequests,
  getTopOtDepartments,
  getApprovalRate,
  getLeaveBalanceStats
} from '../controllers/dashboardController.js';
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

router.get(
  '/top-ot-departments',
  verifyToken,
  [
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2100 })
      .withMessage('Năm thống kê không hợp lệ (2020 - 2100).'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Số lượng phòng ban không hợp lệ (1 - 50).')
  ],
  validateRequest,
  getTopOtDepartments
);

router.get(
  '/approval-rate',
  verifyToken,
  [
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2100 })
      .withMessage('Năm thống kê không hợp lệ (2020 - 2100).'),
    query('department_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Mã phòng ban không hợp lệ.'),
    query('request_type')
      .optional()
      .isIn(['all', 'leave', 'overtime'])
      .withMessage('Loại đơn không hợp lệ (all, leave, overtime).')
  ],
  validateRequest,
  getApprovalRate
);

router.get(
  '/leave-balances',
  verifyToken,
  [
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2100 })
      .withMessage('Năm thống kê không hợp lệ (2020 - 2100).'),
    query('department_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Mã phòng ban không hợp lệ.'),
    query('tier')
      .optional()
      .isIn(['all', 'low', 'medium', 'high', 'exhausted'])
      .withMessage(
        'Phân nhóm tiến độ phép không hợp lệ (all, low, medium, high, exhausted).'
      )
  ],
  validateRequest,
  getLeaveBalanceStats
);

export default router;

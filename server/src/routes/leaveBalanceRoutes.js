import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { getMyBalance, getBalances, updateBalance } from '../controllers/leaveBalanceController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// GET /api/leave-balances/me?year=YYYY — nhân viên xem số dư của mình
router.get(
  '/me',
  verifyToken,
  [query('year').optional().isInt({ min: 2020, max: 2100 }).withMessage('Nam khong hop le.')],
  validateRequest,
  getMyBalance
);

// GET /api/leave-balances?year=YYYY&department_id= — manager/admin xem danh sách
router.get(
  '/',
  verifyToken,
  checkRole(['admin', 'manager']),
  [
    query('year').optional().isInt({ min: 2020, max: 2100 }).withMessage('Nam khong hop le.'),
    query('department_id').optional().isInt({ min: 1 }).withMessage('Phong ban khong hop le.')
  ],
  validateRequest,
  getBalances
);

// PUT /api/leave-balances/:userId/:year — admin điều chỉnh số phép
router.put(
  '/:userId/:year',
  verifyToken,
  checkRole(['admin']),
  [
    param('userId').isInt({ min: 1 }).withMessage('ID nhan vien khong hop le.'),
    param('year').isInt({ min: 2020, max: 2100 }).withMessage('Nam khong hop le.'),
    body('annual_entitlement').optional().isFloat({ min: 0, max: 60 }).withMessage('So ngay phep nam phai tu 0 den 60.'),
    body('carried_over_days').optional().isFloat({ min: 0, max: 30 }).withMessage('So ngay chuyen tiep phai tu 0 den 30.')
  ],
  validateRequest,
  updateBalance
);

export default router;

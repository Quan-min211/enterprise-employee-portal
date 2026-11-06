import { Router } from 'express';
import { query } from 'express-validator';
import { exportAuditLogs, getAuditLogs } from '../controllers/auditLogController.js';
import { checkRole, verifyToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

const filterValidators = [
  query('user_id').optional().isInt({ min: 1 }).withMessage('user_id khong hop le.'),
  query('action').optional().isString().trim().isLength({ max: 100 }).withMessage('action toi da 100 ky tu.'),
  query('entity_type').optional().isString().trim().isLength({ max: 50 }).withMessage('entity_type toi da 50 ky tu.'),
  query('ip_address').optional().isString().trim().isLength({ max: 45 }).withMessage('ip_address toi da 45 ky tu.'),
  query('request_id').optional().isString().trim().isLength({ max: 64 }).withMessage('request_id toi da 64 ky tu.'),
  query('date_from').optional().isISO8601().withMessage('date_from phai la ISO8601.'),
  query('date_to').optional().isISO8601().withMessage('date_to phai la ISO8601.')
];

router.get(
  '/',
  verifyToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Trang khong hop le.'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Gioi han tu 1 den 50.'),
    ...filterValidators
  ],
  validateRequest,
  getAuditLogs
);

router.get(
  '/export',
  verifyToken,
  checkRole(['admin']),
  filterValidators,
  validateRequest,
  exportAuditLogs
);

export default router;

import { Router } from 'express';
import { query } from 'express-validator';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { checkRole, verifyToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get(
  '/',
  verifyToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('user_id').optional().isInt({ min: 1 }),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601()
  ],
  validateRequest,
  getAuditLogs
);

export default router;

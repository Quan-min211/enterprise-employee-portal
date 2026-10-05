import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  seedDefaultHolidays,
  updateHoliday
} from '../controllers/holidayController.js';
import { checkRole, verifyToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// GET /api/holidays?year=YYYY — tất cả roles xem được
router.get(
  '/',
  verifyToken,
  [query('year').optional().isInt({ min: 2020, max: 2100 }).withMessage('Nam khong hop le.')],
  validateRequest,
  getHolidays
);

// POST /api/holidays — admin only
router.post(
  '/',
  verifyToken,
  checkRole(['admin']),
  [
    body('date').isISO8601().toDate().withMessage('Ngay khong dung dinh dang ISO8601 (YYYY-MM-DD).'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Ten ngay le tu 2 den 100 ky tu.'),
    body('type').optional().isIn(['national', 'company', 'maintenance']).withMessage('Loai ngay le khong hop le.')
  ],
  validateRequest,
  createHoliday
);

// POST /api/holidays/seed-defaults — admin only: seed ngày lễ VN mặc định
router.post(
  '/seed-defaults',
  verifyToken,
  checkRole(['admin']),
  seedDefaultHolidays
);

// PUT /api/holidays/:id — admin only
router.put(
  '/:id',
  verifyToken,
  checkRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('ID ngay le khong hop le.'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Ten ngay le tu 2 den 100 ky tu.'),
    body('type').optional().isIn(['national', 'company', 'maintenance']).withMessage('Loai ngay le khong hop le.')
  ],
  validateRequest,
  updateHoliday
);

// DELETE /api/holidays/:id — admin only
router.delete(
  '/:id',
  verifyToken,
  checkRole(['admin']),
  [param('id').isInt({ min: 1 }).withMessage('ID ngay le khong hop le.')],
  validateRequest,
  deleteHoliday
);

export default router;

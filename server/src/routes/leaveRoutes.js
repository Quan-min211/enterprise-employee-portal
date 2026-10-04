import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createLeaveRequest,
  exportLeaveRequests,
  getLeaveRequests,
  getLeaveStats,
  updateLeaveStatus
} from '../controllers/leaveController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.post(
  '/',
  verifyToken,
  [
    body('request_type').optional().isIn(['leave', 'overtime']).withMessage('Loai yeu cau khong hop le.'),
    body('leave_type').optional().isIn(['annual', 'sick', 'unpaid', 'overtime', 'other']).withMessage('Loai phep khong hop le.'),
    body('start_date').isISO8601().withMessage('Ngay bat dau khong hop le.'),
    body('end_date').isISO8601().withMessage('Ngay ket thuc khong hop le.'),
    body('reason').trim().isLength({ min: 10, max: 1000 }).withMessage('Ly do tu 10 den 1000 ky tu.')
  ],
  validateRequest,
  createLeaveRequest
);

router.get(
  '/',
  verifyToken,
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Trang thai khong hop le.'),
    query('request_type').optional().isIn(['leave', 'overtime']).withMessage('Nhom yeu cau khong hop le.'),
    query('leave_type').optional().isIn(['annual', 'sick', 'unpaid', 'overtime', 'other']).withMessage('Loai phep khong hop le.'),
    query('department_id').optional().isInt({ min: 1 }).withMessage('Phong ban khong hop le.'),
    query('user_id').optional().isInt({ min: 1 }).withMessage('Nhan vien khong hop le.'),
    query('date_from').optional().isISO8601().withMessage('Ngay bat dau loc khong hop le.'),
    query('date_to').optional().isISO8601().withMessage('Ngay ket thuc loc khong hop le.'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  getLeaveRequests
);

router.get(
  '/export',
  verifyToken,
  checkRole(['admin', 'manager']),
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Trang thai khong hop le.'),
    query('request_type').optional().isIn(['leave', 'overtime']).withMessage('Nhom yeu cau khong hop le.'),
    query('leave_type').optional().isIn(['annual', 'sick', 'unpaid', 'overtime', 'other']).withMessage('Loai phep khong hop le.'),
    query('department_id').optional().isInt({ min: 1 }).withMessage('Phong ban khong hop le.'),
    query('user_id').optional().isInt({ min: 1 }).withMessage('Nhan vien khong hop le.'),
    query('date_from').optional().isISO8601().withMessage('Ngay bat dau loc khong hop le.'),
    query('date_to').optional().isISO8601().withMessage('Ngay ket thuc loc khong hop le.')
  ],
  validateRequest,
  exportLeaveRequests
);

router.get(
  '/stats',
  verifyToken,
  [query('year').optional().isInt({ min: 2020, max: 2100 }).withMessage('Nam thong ke khong hop le.')],
  validateRequest,
  getLeaveStats
);

router.patch(
  '/:id/status',
  verifyToken,
  checkRole(['admin', 'manager']),
  [
    param('id').isInt({ min: 1 }).withMessage('Ma don khong hop le.'),
    body('status').isIn(['approved', 'rejected']).withMessage('Trang thai chi co the la approved hoac rejected.'),
    body('manager_comment').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Ghi chu toi da 1000 ky tu.')
  ],
  validateRequest,
  updateLeaveStatus
);

export default router;

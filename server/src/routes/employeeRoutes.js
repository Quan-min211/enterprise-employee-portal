import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  changeMyPassword,
  getEmployeeById,
  getEmployees,
  updateMyProfile
} from '../controllers/employeeController.js';
import { verifyToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get(
  '/',
  verifyToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Trang khong hop le.'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Gioi han tu 1 den 50.'),
    query('department_id').optional().isInt({ min: 1 }).withMessage('Phong ban khong hop le.')
  ],
  validateRequest,
  getEmployees
);

router.put(
  '/me',
  verifyToken,
  [
    body('full_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Ho ten tu 2 den 100 ky tu.'),
    body('phone').optional({ nullable: true }).trim().isLength({ max: 20 }).withMessage('So dien thoai toi da 20 ky tu.'),
    body('avatar_url').optional({ nullable: true }).trim().isURL().withMessage('Avatar phai la URL hop le.')
  ],
  validateRequest,
  updateMyProfile
);

router.put(
  '/me/password',
  verifyToken,
  [
    body('current_password').notEmpty().withMessage('Mat khau hien tai la bat buoc.'),
    body('new_password').isLength({ min: 8 }).withMessage('Mat khau moi toi thieu 8 ky tu.')
  ],
  validateRequest,
  changeMyPassword
);

router.get(
  '/:id',
  verifyToken,
  [param('id').isInt({ min: 1 }).withMessage('Ma nhan vien khong hop le.')],
  validateRequest,
  getEmployeeById
);

export default router;

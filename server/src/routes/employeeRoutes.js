import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  changeMyPassword,
  createEmployee,
  deactivateEmployee,
  getEmployeeById,
  getEmployees,
  updateEmployee,
  updateMyProfile
} from '../controllers/employeeController.js';
import { checkRole, verifyToken } from '../middleware/auth.js';
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

router.post(
  '/',
  verifyToken,
  checkRole(['admin']),
  [
    body('employee_code').trim().isLength({ min: 3, max: 20 }).withMessage('Ma nhan vien tu 3 den 20 ky tu.'),
    body('full_name').trim().isLength({ min: 2, max: 100 }).withMessage('Ho ten tu 2 den 100 ky tu.'),
    body('email').isEmail().withMessage('Email khong hop le.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Mat khau toi thieu 8 ky tu.'),
    body('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Vai tro khong hop le.'),
    body('department_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Phong ban khong hop le.'),
    body('hire_date').optional({ nullable: true }).isISO8601().withMessage('Ngay vao lam khong hop le.'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Trang thai khong hop le.')
  ],
  validateRequest,
  createEmployee
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

router.put(
  '/:id',
  verifyToken,
  checkRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Ma nhan vien khong hop le.'),
    body('employee_code').optional().trim().isLength({ min: 3, max: 20 }).withMessage('Ma nhan vien tu 3 den 20 ky tu.'),
    body('full_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Ho ten tu 2 den 100 ky tu.'),
    body('email').optional().isEmail().withMessage('Email khong hop le.').normalizeEmail(),
    body('password').optional().isLength({ min: 8 }).withMessage('Mat khau toi thieu 8 ky tu.'),
    body('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Vai tro khong hop le.'),
    body('department_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Phong ban khong hop le.'),
    body('hire_date').optional({ nullable: true }).isISO8601().withMessage('Ngay vao lam khong hop le.'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Trang thai khong hop le.')
  ],
  validateRequest,
  updateEmployee
);

router.delete(
  '/:id',
  verifyToken,
  checkRole(['admin']),
  [param('id').isInt({ min: 1 }).withMessage('Ma nhan vien khong hop le.')],
  validateRequest,
  deactivateEmployee
);

export default router;

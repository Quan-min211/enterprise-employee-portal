import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment
} from '../controllers/departmentController.js';
import { checkRole, verifyToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get('/', verifyToken, getDepartments);

router.post(
  '/',
  verifyToken,
  checkRole(['admin']),
  [
    body('code').trim().isLength({ min: 2, max: 20 }).withMessage('Ma phong ban tu 2 den 20 ky tu.'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Ten phong ban tu 2 den 100 ky tu.'),
    body('manager_name').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('Ten truong bo phan toi da 100 ky tu.'),
    body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Mo ta toi da 1000 ky tu.')
  ],
  validateRequest,
  createDepartment
);

router.put(
  '/:id',
  verifyToken,
  checkRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Ma phong ban khong hop le.'),
    body('code').optional().trim().isLength({ min: 2, max: 20 }).withMessage('Ma phong ban tu 2 den 20 ky tu.'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Ten phong ban tu 2 den 100 ky tu.'),
    body('manager_name').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('Ten truong bo phan toi da 100 ky tu.'),
    body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Mo ta toi da 1000 ky tu.')
  ],
  validateRequest,
  updateDepartment
);

router.delete(
  '/:id',
  verifyToken,
  checkRole(['admin']),
  [param('id').isInt({ min: 1 }).withMessage('Ma phong ban khong hop le.')],
  validateRequest,
  deleteDepartment
);

export default router;

import { Router } from 'express';
import { getEmployees, getEmployeeById } from '../controllers/employeeController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/', verifyToken, getEmployees);
router.get('/:id', verifyToken, getEmployeeById);

export default router;

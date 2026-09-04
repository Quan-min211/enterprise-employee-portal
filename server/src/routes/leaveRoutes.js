import { Router } from 'express';
import { createLeaveRequest, getLeaveRequests, updateLeaveStatus } from '../controllers/leaveController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = Router();

router.post('/', verifyToken, createLeaveRequest);
router.get('/', verifyToken, getLeaveRequests);
router.patch('/:id/status', verifyToken, checkRole(['admin', 'manager']), updateLeaveStatus);

export default router;

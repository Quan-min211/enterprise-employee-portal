import { Router } from 'express';
import authRoutes from './authRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import leaveRoutes from './leaveRoutes.js';
import announcementRoutes from './announcementRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';
import holidayRoutes from './holidayRoutes.js';
import leaveBalanceRoutes from './leaveBalanceRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/leaves', leaveRoutes);
router.use('/announcements', announcementRoutes);
router.use('/departments', departmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/holidays', holidayRoutes);
router.use('/leave-balances', leaveBalanceRoutes);

export default router;

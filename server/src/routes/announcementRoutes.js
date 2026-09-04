import { Router } from 'express';
import { getAnnouncements, createAnnouncement } from '../controllers/announcementController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = Router();

router.get('/', verifyToken, getAnnouncements);
router.post('/', verifyToken, checkRole(['admin', 'manager']), createAnnouncement);

export default router;

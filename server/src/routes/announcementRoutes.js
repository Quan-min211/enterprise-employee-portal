import { Router } from 'express';
import { body, query } from 'express-validator';
import { getAnnouncements, createAnnouncement } from '../controllers/announcementController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get(
  '/',
  verifyToken,
  [query('priority').optional().isIn(['normal', 'important', 'urgent']).withMessage('Muc uu tien khong hop le.')],
  validateRequest,
  getAnnouncements
);

router.post(
  '/',
  verifyToken,
  checkRole(['admin', 'manager']),
  [
    body('title').trim().isLength({ min: 5, max: 255 }).withMessage('Tieu de tu 5 den 255 ky tu.'),
    body('content').trim().isLength({ min: 10 }).withMessage('Noi dung toi thieu 10 ky tu.'),
    body('priority').optional().isIn(['normal', 'important', 'urgent']).withMessage('Muc uu tien khong hop le.'),
    body('expires_at').optional({ nullable: true }).isISO8601().withMessage('Ngay het han khong hop le.')
  ],
  validateRequest,
  createAnnouncement
);

export default router;

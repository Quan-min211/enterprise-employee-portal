import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { createAnnouncement, deleteAnnouncement, getAnnouncements, updateAnnouncement } from '../controllers/announcementController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get(
  '/',
  verifyToken,
  [
    query('priority').optional().isIn(['normal', 'important', 'urgent']).withMessage('Muc uu tien khong hop le.'),
    query('page').optional().isInt({ min: 1 }).withMessage('Trang khong hop le.'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Gioi han tu 1 den 50.')
  ],
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

const announcementFields = [
  body('title').trim().isLength({ min: 5, max: 255 }).withMessage('Tieu de tu 5 den 255 ky tu.'),
  body('content').trim().isLength({ min: 10 }).withMessage('Noi dung toi thieu 10 ky tu.'),
  body('priority').optional().isIn(['normal', 'important', 'urgent']).withMessage('Muc uu tien khong hop le.'),
  body('expires_at').optional({ nullable: true }).isISO8601().withMessage('Ngay het han khong hop le.')
];

router.put('/:id', verifyToken, checkRole(['admin', 'manager']), [param('id').isInt({ min: 1 }), ...announcementFields], validateRequest, updateAnnouncement);
router.delete('/:id', verifyToken, checkRole(['admin', 'manager']), [param('id').isInt({ min: 1 })], validateRequest, deleteAnnouncement);

export default router;

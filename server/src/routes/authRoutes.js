import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, getMe } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email khong hop le.').normalizeEmail(),
    body('password').notEmpty().withMessage('Mat khau la bat buoc.')
  ],
  validateRequest,
  login
);

router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getMe);

export default router;

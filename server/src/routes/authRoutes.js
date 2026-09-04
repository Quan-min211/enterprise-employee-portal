import { Router } from 'express';
import { login, logout, getMe } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);

export default router;

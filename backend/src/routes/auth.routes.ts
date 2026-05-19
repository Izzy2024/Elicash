import { Router } from 'express';
import { login, logout, register, me, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.post('/login', authRateLimiter, login);
router.post('/register', authRateLimiter, register); // Normally restricted, but useful for first setup
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);

export default router;

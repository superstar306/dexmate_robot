import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { register, login, refreshToken } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('username').optional().trim().isLength({ min: 1 }),
    body('name').optional().trim(),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  login
);

router.post('/refresh', refreshToken);

export default router;


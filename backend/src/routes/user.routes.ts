import { Router } from 'express';
import { getProfile, updateProfile, listUsers } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);
router.patch('/me', authenticate, updateProfile);
router.get('/users', authenticate, listUsers);

export default router;


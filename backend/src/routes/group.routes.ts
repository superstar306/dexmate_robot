import { Router } from 'express';
import {
  listGroups,
  getGroup,
  createGroup,
  deleteGroup,
  upsertMember,
  removeMember,
  listGroupRobots,
  createGroupRobot,
} from '../controllers/group.controller.js';
import { authenticate } from '../middleware/auth.js';
import { body, param } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', listGroups);
router.post('/', [
  body('name').trim().notEmpty(),
], createGroup);
router.get('/:id', [
  param('id').isInt(),
], getGroup);
router.delete('/:id', [
  param('id').isInt(),
], deleteGroup);
router.post('/:id/members', [
  param('id').isInt(),
  body('user_id').isInt(),
  body('role').optional().custom((value) => {
    if (!value) return true; // Optional field
    const normalized = String(value).toUpperCase();
    return ['ADMIN', 'MEMBER'].includes(normalized);
  }).withMessage('Role must be ADMIN or MEMBER'),
], upsertMember);
router.delete('/:id/members/:userId', [
  param('id').isInt(),
  param('userId').isInt(),
], removeMember);
router.get('/:id/robots', [
  param('id').isInt(),
], listGroupRobots);
router.post('/:id/robots', [
  param('id').isInt(),
  body('serial_number').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('model').optional().trim(),
], createGroupRobot);

export default router;


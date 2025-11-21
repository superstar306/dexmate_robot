import { Router } from 'express';
import {
  listRobots,
  getRobot,
  createRobot,
  updateRobot,
  deleteRobot,
  assignRobot,
  grantPermission,
  revokePermission,
  getRobotSettings,
  updateRobotSettings,
  getMySettings,
} from '../controllers/robot.controller.js';
import { authenticate } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', listRobots);
router.post('/', [
  body('serial_number').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('model').optional().trim(),
  body('owner_group_id').optional().isInt(),
], createRobot);
router.get('/my-settings', getMySettings);
router.get('/:serialNumber/settings', [
  param('serialNumber').notEmpty(),
], getRobotSettings);
router.put('/:serialNumber/settings', [
  param('serialNumber').notEmpty(),
  body('settings').isObject(),
], updateRobotSettings);
router.get('/:serialNumber', [
  param('serialNumber').notEmpty(),
], getRobot);
router.put('/:serialNumber', [
  param('serialNumber').notEmpty(),
], updateRobot);
router.delete('/:serialNumber', [
  param('serialNumber').notEmpty(),
], deleteRobot);
router.post('/:serialNumber/assign', [
  param('serialNumber').notEmpty(),
  body('user_id').isInt().withMessage('user_id must be an integer (use 0 to unassign)'),
], assignRobot);
router.post('/:serialNumber/permissions', [
  param('serialNumber').notEmpty(),
  body('user_id').isInt(),
  body('permission_type').isIn(['USAGE', 'ADMIN']),
], grantPermission);
router.delete('/:serialNumber/permissions/:userId', [
  param('serialNumber').notEmpty(),
  param('userId').isInt(),
], revokePermission);

export default router;


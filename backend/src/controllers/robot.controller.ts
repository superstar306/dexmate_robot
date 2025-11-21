import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { query } from '../lib/db.js';
import { createError } from '../middleware/errorHandler.js';
import { getAccessibleRobots, hasAdminPermission, formatRobot, getUserRobotPermission } from '../services/robot.service.js';
import { PermissionType } from '../types/index.js';

export async function listRobots(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const robots = await getAccessibleRobots(req.user.id);
    const formatted = await Promise.all(
      robots.map(async (robot) => {
        const permission = await getUserRobotPermission(req.user!.id, robot.serial_number);
        return formatRobot(robot, req.user!.id, permission);
      })
    );

    res.json({
      results: formatted,
      count: formatted.length,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function getRobot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { serialNumber } = req.params;
    const decodedSerial = decodeURIComponent(serialNumber);

    const robotResult = await query<{
      serial_number: string;
      name: string;
      model?: string | null;
      owner_user_id?: number | null;
      owner_group_id?: number | null;
      assigned_user_id?: number | null;
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT * FROM robots WHERE serial_number = $1',
      [decodedSerial]
    );

    if (robotResult.rows.length === 0) {
      return next(createError('Robot not found', 404));
    }

    const robot = robotResult.rows[0];

    // Check access
    const accessibleRobots = await getAccessibleRobots(req.user.id);
    const hasAccess = accessibleRobots.some(r => r.serial_number === decodedSerial);
    
    if (!hasAccess) {
      return next(createError('Permission denied', 403));
    }

    // Get full robot data with relations
    const fullRobotResult = await query<{
      serial_number: string;
      name: string;
      model?: string | null;
      owner_user_id?: number | null;
      owner_group_id?: number | null;
      assigned_user_id?: number | null;
      created_at: Date;
      updated_at: Date;
      owner_user_email?: string;
      owner_user_username?: string;
      owner_user_name?: string;
      owner_group_name?: string;
      assigned_user_email?: string;
      assigned_user_username?: string;
      assigned_user_name?: string;
    }>(`
      SELECT 
        r.*,
        ou.email as owner_user_email,
        ou.username as owner_user_username,
        ou.name as owner_user_name,
        og.name as owner_group_name,
        au.email as assigned_user_email,
        au.username as assigned_user_username,
        au.name as assigned_user_name
      FROM robots r
      LEFT JOIN users ou ON r.owner_user_id = ou.id
      LEFT JOIN groups og ON r.owner_group_id = og.id
      LEFT JOIN users au ON r.assigned_user_id = au.id
      WHERE r.serial_number = $1
    `, [decodedSerial]);

    const fullRobot = fullRobotResult.rows[0];

    // Get permissions
    const permissionsResult = await query<{
      id: number;
      user_id: number;
      permission_type: PermissionType;
      granted_by_id?: number | null;
      created_at: Date;
      user_email: string;
      user_username: string;
      user_name?: string | null;
      granted_by_email?: string;
      granted_by_username?: string;
      granted_by_name?: string | null;
    }>(`
      SELECT 
        rp.*,
        u.email as user_email,
        u.username as user_username,
        u.name as user_name,
        gb.email as granted_by_email,
        gb.username as granted_by_username,
        gb.name as granted_by_name
      FROM robot_permissions rp
      JOIN users u ON rp.user_id = u.id
      LEFT JOIN users gb ON rp.granted_by_id = gb.id
      WHERE rp.robot_serial_number = $1
      ORDER BY rp.created_at DESC
    `, [decodedSerial]);

    const permission = await getUserRobotPermission(req.user.id, decodedSerial);
    const formatted = formatRobot(fullRobot, req.user.id, permission);
    
    const permissions = permissionsResult.rows.map(p => ({
      id: p.id,
      user: {
        id: p.user_id,
        email: p.user_email,
        username: p.user_username,
        name: p.user_name,
      },
      permission_type: p.permission_type,
      granted_by: p.granted_by_id ? {
        id: p.granted_by_id,
        email: p.granted_by_email || '',
        username: p.granted_by_username || '',
        name: p.granted_by_name,
      } : null,
      created_at: p.created_at,
    }));

    res.json({
      ...formatted,
      permissions,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function createRobot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { serial_number, name, model, owner_group_id } = req.body;

    // Validate XOR constraint: either owner_user or owner_group, not both
    if (owner_group_id) {
      // Check if user is admin of the group
      const groupResult = await query<{ owner_id: number }>(
        'SELECT owner_id FROM groups WHERE id = $1',
        [owner_group_id]
      );

      if (groupResult.rows.length === 0) {
        return next(createError('Group not found', 404));
      }

      const group = groupResult.rows[0];
      const membershipResult = await query<{ role: string }>(
        'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
        [owner_group_id, req.user.id]
      );

      const isOwner = group.owner_id === req.user.id;
      const isAdmin = membershipResult.rows.length > 0 && membershipResult.rows[0].role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        return next(createError('Only group admins can register robots for the group', 403));
      }

      // Create group-owned robot
      const robotResult = await query<{
        serial_number: string;
        name: string;
        model?: string | null;
        owner_group_id?: number | null;
        assigned_user_id?: number | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO robots (serial_number, name, model, owner_group_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [serial_number, name, model || null, owner_group_id]
      );

      const robot = robotResult.rows[0];
      
      // Get full robot data
      const fullRobotResult = await query(`
        SELECT 
          r.*,
          og.name as owner_group_name
        FROM robots r
        LEFT JOIN groups og ON r.owner_group_id = og.id
        WHERE r.serial_number = $1
      `, [serial_number]);

      const formatted = formatRobot(fullRobotResult.rows[0], req.user.id, 'ADMIN');
      res.status(201).json(formatted);
    } else {
      // Create user-owned robot
      const robotResult = await query<{
        serial_number: string;
        name: string;
        model?: string | null;
        owner_user_id?: number | null;
        assigned_user_id?: number | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO robots (serial_number, name, model, owner_user_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [serial_number, name, model || null, req.user.id]
      );

      const robot = robotResult.rows[0];
      
      // Get full robot data
      const fullRobotResult = await query(`
        SELECT 
          r.*,
          ou.email as owner_user_email,
          ou.username as owner_user_username,
          ou.name as owner_user_name
        FROM robots r
        LEFT JOIN users ou ON r.owner_user_id = ou.id
        WHERE r.serial_number = $1
      `, [serial_number]);

      const formatted = formatRobot(fullRobotResult.rows[0], req.user.id, 'ADMIN');
      res.status(201).json(formatted);
    }
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return next(createError('Robot with this serial number already exists', 400));
    }
    next(error);
  }
}

export async function updateRobot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { serialNumber } = req.params;
    const decodedSerial = decodeURIComponent(serialNumber);

    const robotResult = await query<{
      serial_number: string;
      owner_user_id?: number | null;
      owner_group_id?: number | null;
    }>(
      'SELECT serial_number, owner_user_id, owner_group_id FROM robots WHERE serial_number = $1',
      [decodedSerial]
    );

    if (robotResult.rows.length === 0) {
      return next(createError('Robot not found', 404));
    }

    const robot = robotResult.rows[0];

    // Check admin permission
    const hasAdmin = await hasAdminPermission(req.user.id, {
      serialNumber: decodedSerial,
      ownerUserId: robot.owner_user_id,
      ownerGroupId: robot.owner_group_id,
    });
    if (!hasAdmin) {
      return next(createError('Admin level permission required', 403));
    }

    const { name, model } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }
    if (model !== undefined) {
      updates.push(`model = $${paramCount}`);
      params.push(model);
      paramCount++;
    }

    if (updates.length === 0) {
      // No updates, return current robot
      return getRobot(req, res, next);
    }

    params.push(decodedSerial);
    const updateQuery = `
      UPDATE robots 
      SET ${updates.join(', ')} 
      WHERE serial_number = $${paramCount}
      RETURNING *
    `;

    const updatedResult = await query(updateQuery, params);
    const updated = updatedResult.rows[0];

    // Get full robot data
    const fullRobotResult = await query(`
      SELECT 
        r.*,
        ou.email as owner_user_email,
        ou.username as owner_user_username,
        ou.name as owner_user_name,
        og.name as owner_group_name,
        au.email as assigned_user_email,
        au.username as assigned_user_username,
        au.name as assigned_user_name
      FROM robots r
      LEFT JOIN users ou ON r.owner_user_id = ou.id
      LEFT JOIN groups og ON r.owner_group_id = og.id
      LEFT JOIN users au ON r.assigned_user_id = au.id
      WHERE r.serial_number = $1
    `, [decodedSerial]);

    const permission = await getUserRobotPermission(req.user.id, decodedSerial);
    const formatted = formatRobot(fullRobotResult.rows[0], req.user.id, permission);
    res.json(formatted);
  } catch (error: any) {
    next(error);
  }
}

export async function deleteRobot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { serialNumber } = req.params;
    const decodedSerial = decodeURIComponent(serialNumber);

    const robotResult = await query<{
      serial_number: string;
      owner_user_id?: number | null;
      owner_group_id?: number | null;
    }>(
      'SELECT serial_number, owner_user_id, owner_group_id FROM robots WHERE serial_number = $1',
      [decodedSerial]
    );

    if (robotResult.rows.length === 0) {
      return next(createError('Robot not found', 404));
    }

    const robot = robotResult.rows[0];

    // Only owner can delete
    if (robot.owner_user_id !== req.user.id) {
      if (robot.owner_group_id) {
        const groupResult = await query<{ owner_id: number }>(
          'SELECT owner_id FROM groups WHERE id = $1',
          [robot.owner_group_id]
        );

        if (groupResult.rows.length === 0 || groupResult.rows[0].owner_id !== req.user.id) {
          const membershipResult = await query<{ role: string }>(
            'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
            [robot.owner_group_id, req.user.id]
          );

          if (membershipResult.rows.length === 0 || membershipResult.rows[0].role !== 'ADMIN') {
            return next(createError('Only the robot owner can delete this robot', 403));
          }
        }
      } else {
        return next(createError('Only the robot owner can delete this robot', 403));
      }
    }

    await query('DELETE FROM robots WHERE serial_number = $1', [decodedSerial]);

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
}

export async function assignRobot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { serialNumber } = req.params;
    const decodedSerial = decodeURIComponent(serialNumber);
    const { user_id } = req.body;

    const robotResult = await query<{
      serial_number: string;
      owner_user_id?: number | null;
      owner_group_id?: number | null;
    }>(
      'SELECT serial_number, owner_user_id, owner_group_id FROM robots WHERE serial_number = $1',
      [decodedSerial]
    );

    if (robotResult.rows.length === 0) {
      return next(createError('Robot not found', 404));
    }

    const robot = robotResult.rows[0];

    // Only group-owned robots can be assigned
    if (!robot.owner_group_id) {
      return next(createError('Only group-owned robots can be assigned to members', 400));
    }

    // Check admin permission
    const hasAdmin = await hasAdminPermission(req.user.id, {
      serialNumber: decodedSerial,
      ownerUserId: robot.owner_user_id,
      ownerGroupId: robot.owner_group_id,
    });
    if (!hasAdmin) {
      return next(createError('Admin level permission required', 403));
    }

    // Check if user is member of the group
    const membershipResult = await query(
      'SELECT user_id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [robot.owner_group_id, user_id]
    );
    
    if (membershipResult.rows.length === 0) {
      return next(createError('User must belong to the owning group', 400));
    }

    await query(
      'UPDATE robots SET assigned_user_id = $1 WHERE serial_number = $2',
      [user_id, decodedSerial]
    );

    // Return updated robot (same as getRobot)
    return getRobot(req, res, next);
  } catch (error: any) {
    next(error);
  }
}

export async function grantPermission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { serialNumber } = req.params;
    const decodedSerial = decodeURIComponent(serialNumber);
    const { user_id, permission_type } = req.body;

    const robotResult = await query<{
      serial_number: string;
      owner_user_id?: number | null;
      owner_group_id?: number | null;
    }>(
      'SELECT serial_number, owner_user_id, owner_group_id FROM robots WHERE serial_number = $1',
      [decodedSerial]
    );

    if (robotResult.rows.length === 0) {
      return next(createError('Robot not found', 404));
    }

    const robot = robotResult.rows[0];

    // Check admin permission
    const hasAdmin = await hasAdminPermission(req.user.id, {
      serialNumber: decodedSerial,
      ownerUserId: robot.owner_user_id,
      ownerGroupId: robot.owner_group_id,
    });
    if (!hasAdmin) {
      return next(createError('Admin level permission required', 403));
    }

    // Prevent granting permission to owner
    if (robot.owner_user_id === user_id) {
      return next(createError('Owners already have admin access', 400));
    }

    const permissionResult = await query<{
      id: number;
      permission_type: PermissionType;
      created_at: Date;
    }>(
      `INSERT INTO robot_permissions (robot_serial_number, user_id, permission_type, granted_by_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (robot_serial_number, user_id)
       DO UPDATE SET permission_type = $3, granted_by_id = $4
       RETURNING id, permission_type, created_at`,
      [decodedSerial, user_id, permission_type, req.user.id]
    );

    const permission = permissionResult.rows[0];

    // Get user and granted_by info
    const userResult = await query<{
      id: number;
      email: string;
      username: string;
      name?: string | null;
    }>(
      'SELECT id, email, username, name FROM users WHERE id = $1',
      [user_id]
    );

    const grantedByResult = await query<{
      id: number;
      email: string;
      username: string;
      name?: string | null;
    }>(
      'SELECT id, email, username, name FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      id: permission.id,
      user: userResult.rows[0],
      permission_type: permission.permission_type,
      granted_by: grantedByResult.rows[0],
      created_at: permission.created_at,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function revokePermission(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { serialNumber, userId } = req.params;
    const decodedSerial = decodeURIComponent(serialNumber);
    const userIdNum = parseInt(userId, 10);

    const robotResult = await query<{
      serial_number: string;
      owner_user_id?: number | null;
      owner_group_id?: number | null;
    }>(
      'SELECT serial_number, owner_user_id, owner_group_id FROM robots WHERE serial_number = $1',
      [decodedSerial]
    );

    if (robotResult.rows.length === 0) {
      return next(createError('Robot not found', 404));
    }

    const robot = robotResult.rows[0];

    // Check admin permission
    const hasAdmin = await hasAdminPermission(req.user.id, {
      serialNumber: decodedSerial,
      ownerUserId: robot.owner_user_id,
      ownerGroupId: robot.owner_group_id,
    });
    if (!hasAdmin) {
      return next(createError('Admin level permission required', 403));
    }

    const permissionResult = await query(
      'SELECT user_id FROM robot_permissions WHERE robot_serial_number = $1 AND user_id = $2',
      [decodedSerial, userIdNum]
    );

    if (permissionResult.rows.length === 0) {
      return next(createError('Permission not found', 404));
    }

    // Prevent revoking from owner
    if (robot.owner_user_id === userIdNum) {
      return next(createError('Cannot revoke permission from robot owner', 400));
    }

    await query(
      'DELETE FROM robot_permissions WHERE robot_serial_number = $1 AND user_id = $2',
      [decodedSerial, userIdNum]
    );

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
}

export async function getRobotSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { serialNumber } = req.params;
    const decodedSerial = decodeURIComponent(serialNumber);

    // Check access
    const accessibleRobots = await getAccessibleRobots(req.user.id);
    const hasAccess = accessibleRobots.some(r => r.serial_number === decodedSerial);
    
    if (!hasAccess) {
      return next(createError('Permission denied', 403));
    }

    const settingResult = await query<{
      settings: any;
    }>(
      `INSERT INTO robot_settings (robot_serial_number, user_id, settings)
       VALUES ($1, $2, '{}'::jsonb)
       ON CONFLICT (robot_serial_number, user_id)
       DO UPDATE SET robot_serial_number = robot_settings.robot_serial_number
       RETURNING settings`,
      [decodedSerial, req.user.id]
    );

    res.json({
      settings: settingResult.rows[0].settings,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function updateRobotSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { serialNumber } = req.params;
    const decodedSerial = decodeURIComponent(serialNumber);
    const { settings } = req.body;

    // Check access
    const accessibleRobots = await getAccessibleRobots(req.user.id);
    const hasAccess = accessibleRobots.some(r => r.serial_number === decodedSerial);
    
    if (!hasAccess) {
      return next(createError('Permission denied', 403));
    }

    const settingResult = await query<{
      settings: any;
    }>(
      `INSERT INTO robot_settings (robot_serial_number, user_id, settings)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (robot_serial_number, user_id)
       DO UPDATE SET settings = $3::jsonb
       RETURNING settings`,
      [decodedSerial, req.user.id, JSON.stringify(settings || {})]
    );

    res.json({
      settings: settingResult.rows[0].settings,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function getMySettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const settingsResult = await query<{
      robot_serial_number: string;
      settings: any;
      updated_at: Date;
    }>(
      `SELECT robot_serial_number, settings, updated_at 
       FROM robot_settings 
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    );

    // Get robots for each setting
    const robotsData = await Promise.all(
      settingsResult.rows.map(async (setting) => {
        const robotData = await getAccessibleRobots(req.user!.id);
        const robot = robotData.find(r => r.serial_number === setting.robot_serial_number);
        if (!robot) return null;

        const permission = await getUserRobotPermission(req.user!.id, robot.serial_number);
        return {
          robot: formatRobot(robot, req.user!.id, permission),
          settings: setting.settings,
          updated_at: setting.updated_at,
        };
      })
    );

    const formatted = robotsData.filter(Boolean);
    res.json(formatted);
  } catch (error: any) {
    next(error);
  }
}

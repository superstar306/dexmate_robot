import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { query } from '../lib/db.js';
import { createError } from '../middleware/errorHandler.js';
import { formatRobot, getUserRobotPermission, getAccessibleRobots } from '../services/robot.service.js';

export async function listGroups(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const groupsResult = await query<{
      id: number;
      name: string;
      owner_id: number;
      created_at: Date;
      owner_email: string;
      owner_username: string;
      owner_name?: string | null;
    }>(`
      SELECT 
        g.*,
        u.email as owner_email,
        u.username as owner_username,
        u.name as owner_name
      FROM groups g
      JOIN users u ON g.owner_id = u.id
      WHERE g.owner_id = $1 
         OR g.id IN (
           SELECT group_id FROM group_memberships WHERE user_id = $1
         )
      ORDER BY g.created_at DESC
    `, [req.user.id]);

    // Get memberships for each group
    const formatted = await Promise.all(
      groupsResult.rows.map(async (group) => {
        const membershipsResult = await query<{
          id: number;
          user_id: number;
          role: string;
          created_at: Date;
          user_email: string;
          user_username: string;
          user_name?: string | null;
        }>(`
          SELECT 
            gm.*,
            u.email as user_email,
            u.username as user_username,
            u.name as user_name
          FROM group_memberships gm
          JOIN users u ON gm.user_id = u.id
          WHERE gm.group_id = $1
          ORDER BY gm.created_at ASC
        `, [group.id]);

        return {
          id: group.id,
          name: group.name,
          owner: {
            id: group.owner_id,
            email: group.owner_email,
            username: group.owner_username,
            name: group.owner_name,
          },
          members: membershipsResult.rows.map(m => ({
            id: m.id,
            user: {
              id: m.user_id,
              email: m.user_email,
              username: m.user_username,
              name: m.user_name,
            },
            role: m.role,
            created_at: m.created_at,
          })),
          created_at: group.created_at,
        };
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

export async function getGroup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { id } = req.params;
    const groupId = parseInt(id, 10);

    const groupResult = await query<{
      id: number;
      name: string;
      owner_id: number;
      created_at: Date;
      owner_email: string;
      owner_username: string;
      owner_name?: string | null;
    }>(`
      SELECT 
        g.*,
        u.email as owner_email,
        u.username as owner_username,
        u.name as owner_name
      FROM groups g
      JOIN users u ON g.owner_id = u.id
      WHERE g.id = $1
    `, [groupId]);

    if (groupResult.rows.length === 0) {
      return next(createError('Group not found', 404));
    }

    const group = groupResult.rows[0];

    // Check access
    const membershipResult = await query(
      'SELECT user_id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, req.user.id]
    );

    const hasAccess = group.owner_id === req.user.id || membershipResult.rows.length > 0;

    if (!hasAccess) {
      return next(createError('Permission denied', 403));
    }

    // Get memberships
    const membershipsResult = await query<{
      id: number;
      user_id: number;
      role: string;
      created_at: Date;
      user_email: string;
      user_username: string;
      user_name?: string | null;
    }>(`
      SELECT 
        gm.*,
        u.email as user_email,
        u.username as user_username,
        u.name as user_name
      FROM group_memberships gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.created_at ASC
    `, [groupId]);

    res.json({
      id: group.id,
      name: group.name,
      owner: {
        id: group.owner_id,
        email: group.owner_email,
        username: group.owner_username,
        name: group.owner_name,
      },
      members: membershipsResult.rows.map(m => ({
        id: m.id,
        user: {
          id: m.user_id,
          email: m.user_email,
          username: m.user_username,
          name: m.user_name,
        },
        role: m.role,
        created_at: m.created_at,
      })),
      created_at: group.created_at,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function createGroup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { name } = req.body;

    const groupResult = await query<{
      id: number;
      name: string;
      owner_id: number;
      created_at: Date;
    }>(
      'INSERT INTO groups (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );

    const group = groupResult.rows[0];

    // Add owner as admin member
    await query(
      'INSERT INTO group_memberships (group_id, user_id, role) VALUES ($1, $2, $3)',
      [group.id, req.user.id, 'ADMIN']
    );

    // Get full group data
    const fullGroupResult = await query<{
      id: number;
      name: string;
      owner_id: number;
      created_at: Date;
      owner_email: string;
      owner_username: string;
      owner_name?: string | null;
    }>(`
      SELECT 
        g.*,
        u.email as owner_email,
        u.username as owner_username,
        u.name as owner_name
      FROM groups g
      JOIN users u ON g.owner_id = u.id
      WHERE g.id = $1
    `, [group.id]);

    const fullGroup = fullGroupResult.rows[0];

    // Get memberships
    const membershipsResult = await query<{
      id: number;
      user_id: number;
      role: string;
      created_at: Date;
      user_email: string;
      user_username: string;
      user_name?: string | null;
    }>(`
      SELECT 
        gm.*,
        u.email as user_email,
        u.username as user_username,
        u.name as user_name
      FROM group_memberships gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.created_at ASC
    `, [group.id]);

    res.status(201).json({
      id: fullGroup.id,
      name: fullGroup.name,
      owner: {
        id: fullGroup.owner_id,
        email: fullGroup.owner_email,
        username: fullGroup.owner_username,
        name: fullGroup.owner_name,
      },
      members: membershipsResult.rows.map(m => ({
        id: m.id,
        user: {
          id: m.user_id,
          email: m.user_email,
          username: m.user_username,
          name: m.user_name,
        },
        role: m.role,
        created_at: m.created_at,
      })),
      created_at: fullGroup.created_at,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function deleteGroup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { id } = req.params;
    const groupId = parseInt(id, 10);

    const groupResult = await query<{
      id: number;
      owner_id: number;
    }>(
      'SELECT id, owner_id FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return next(createError('Group not found', 404));
    }

    const group = groupResult.rows[0];

    // Only owner can delete
    if (group.owner_id !== req.user.id) {
      return next(createError('Only the group owner can delete the group', 403));
    }

    await query('DELETE FROM groups WHERE id = $1', [groupId]);

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
}

export async function upsertMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { id } = req.params;
    const groupId = parseInt(id, 10);
    const { user_id, role = 'MEMBER' } = req.body;

    const groupResult = await query<{
      id: number;
      owner_id: number;
    }>(
      'SELECT id, owner_id FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return next(createError('Group not found', 404));
    }

    const group = groupResult.rows[0];

    // Check admin permission
    const isOwner = group.owner_id === req.user.id;
    const membershipResult = await query<{ role: string }>(
      'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, req.user.id]
    );
    const isAdmin = isOwner || (membershipResult.rows.length > 0 && membershipResult.rows[0].role === 'ADMIN');

    if (!isAdmin) {
      return next(createError('Group admin privileges required', 403));
    }

    const memberResult = await query<{
      id: number;
      user_id: number;
      role: string;
      created_at: Date;
    }>(
      `INSERT INTO group_memberships (group_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (group_id, user_id)
       DO UPDATE SET role = $3
       RETURNING *`,
      [groupId, user_id, role]
    );

    const member = memberResult.rows[0];

    // Get user info
    const userResult = await query<{
      id: number;
      email: string;
      username: string;
      name?: string | null;
    }>(
      'SELECT id, email, username, name FROM users WHERE id = $1',
      [user_id]
    );

    res.json({
      id: member.id,
      user: userResult.rows[0],
      role: member.role,
      created_at: member.created_at,
    });
  } catch (error: any) {
    next(error);
  }
}

export async function removeMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { id, userId } = req.params;
    const groupId = parseInt(id, 10);
    const userIdNum = parseInt(userId, 10);

    const groupResult = await query<{
      id: number;
      owner_id: number;
    }>(
      'SELECT id, owner_id FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return next(createError('Group not found', 404));
    }

    const group = groupResult.rows[0];

    // Check admin permission
    const isOwner = group.owner_id === req.user.id;
    const membershipResult = await query<{ role: string }>(
      'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, req.user.id]
    );
    const isAdmin = isOwner || (membershipResult.rows.length > 0 && membershipResult.rows[0].role === 'ADMIN');

    if (!isAdmin) {
      return next(createError('Group admin privileges required', 403));
    }

    const memberMembershipResult = await query(
      'SELECT user_id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, userIdNum]
    );

    if (memberMembershipResult.rows.length === 0) {
      return next(createError('Member not found', 404));
    }

    // Prevent removing owner
    if (group.owner_id === userIdNum) {
      return next(createError('Cannot remove the group owner', 400));
    }

    await query(
      'DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, userIdNum]
    );

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
}

export async function listGroupRobots(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { id } = req.params;
    const groupId = parseInt(id, 10);

    // Check access
    const groupResult = await query<{
      id: number;
      owner_id: number;
    }>(
      'SELECT id, owner_id FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return next(createError('Group not found', 404));
    }

    const group = groupResult.rows[0];
    const membershipResult = await query(
      'SELECT user_id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, req.user.id]
    );

    const hasAccess = group.owner_id === req.user.id || membershipResult.rows.length > 0;

    if (!hasAccess) {
      return next(createError('Permission denied', 403));
    }

    const robots = await getAccessibleRobots(req.user.id);
    const groupRobots = robots.filter(r => r.owner_group_id === groupId);

    const formatted = await Promise.all(
      groupRobots.map(async (robot) => {
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

export async function createGroupRobot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(createError('Unauthorized', 401));
    }

    const { id } = req.params;
    const groupId = parseInt(id, 10);
    const { serial_number, name, model } = req.body;

    // Check if user is admin of the group
    const groupResult = await query<{
      id: number;
      owner_id: number;
    }>(
      'SELECT id, owner_id FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return next(createError('Group not found', 404));
    }

    const group = groupResult.rows[0];
    const membershipResult = await query<{ role: string }>(
      'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, req.user.id]
    );

    const isOwner = group.owner_id === req.user.id;
    const isAdmin = membershipResult.rows.length > 0 && membershipResult.rows[0].role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return next(createError('Only group admins can register robots for the group', 403));
    }

    const robotResult = await query<{
      serial_number: string;
      name: string;
      model?: string | null;
      owner_group_id?: number | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO robots (serial_number, name, model, owner_group_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [serial_number, name, model || null, groupId]
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
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return next(createError('Robot with this serial number already exists', 400));
    }
    next(error);
  }
}

import { query } from '../lib/db.js';
import { PermissionType } from '../types/index.js';

interface RobotRow {
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
  owner_group_owner_id?: number;
  assigned_user_email?: string;
  assigned_user_username?: string;
  assigned_user_name?: string;
}

/**
 * Get all robots accessible to a user
 */
export async function getAccessibleRobots(userId: number) {
  // Get user's group IDs
  const userGroupsResult = await query(
    'SELECT group_id FROM group_memberships WHERE user_id = $1',
    [userId]
  );
  const groupIds = userGroupsResult.rows.map(r => r.group_id);

  // Get robot permissions for this user
  const permissionsResult = await query(
    'SELECT robot_serial_number FROM robot_permissions WHERE user_id = $1',
    [userId]
  );
  const permissionRobotIds = permissionsResult.rows.map(r => r.robot_serial_number);

  // Build query conditions
  const conditions: string[] = [];
  const params: any[] = [];
  let paramCount = 1;

  if (groupIds.length > 0) {
    conditions.push(`owner_group_id = ANY($${paramCount}::int[])`);
    params.push(groupIds);
    paramCount++;
  }

  if (permissionRobotIds.length > 0) {
    conditions.push(`serial_number = ANY($${paramCount}::varchar[])`);
    params.push(permissionRobotIds);
    paramCount++;
  }

  conditions.push(`owner_user_id = $${paramCount}`);
  params.push(userId);
  paramCount++;

  conditions.push(`assigned_user_id = $${paramCount}`);
  params.push(userId);

  const whereClause = conditions.join(' OR ');

  const result = await query<RobotRow>(`
    SELECT 
      r.*,
      ou.email as owner_user_email,
      ou.username as owner_user_username,
      ou.name as owner_user_name,
      og.name as owner_group_name,
      og.owner_id as owner_group_owner_id,
      au.email as assigned_user_email,
      au.username as assigned_user_username,
      au.name as assigned_user_name
    FROM robots r
    LEFT JOIN users ou ON r.owner_user_id = ou.id
    LEFT JOIN groups og ON r.owner_group_id = og.id
    LEFT JOIN users au ON r.assigned_user_id = au.id
    WHERE ${whereClause}
    ORDER BY r.created_at DESC
  `, params);

  return result.rows;
}

/**
 * Get user's permission on a robot
 */
export async function getUserRobotPermission(
  userId: number,
  robotSerialNumber: string
): Promise<PermissionType | null> {
  const robotResult = await query<{
    owner_user_id?: number | null;
    owner_group_id?: number | null;
    assigned_user_id?: number | null;
  }>(
    'SELECT owner_user_id, owner_group_id, assigned_user_id FROM robots WHERE serial_number = $1',
    [robotSerialNumber]
  );

  if (robotResult.rows.length === 0) {
    return null;
  }

  const robot = robotResult.rows[0];

  // Owner has admin
  if (robot.owner_user_id === userId) {
    return 'ADMIN';
  }

  // Check if user is group admin or owner
  if (robot.owner_group_id) {
    const groupResult = await query(
      'SELECT owner_id FROM groups WHERE id = $1',
      [robot.owner_group_id]
    );

    if (groupResult.rows.length > 0 && groupResult.rows[0].owner_id === userId) {
      return 'ADMIN';
    }

    const membershipResult = await query(
      'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [robot.owner_group_id, userId]
    );

    if (membershipResult.rows.length > 0 && membershipResult.rows[0].role === 'ADMIN') {
      return 'ADMIN';
    }
  }

  // Assigned user has usage
  if (robot.assigned_user_id === userId) {
    return 'USAGE';
  }

  // Check explicit permissions
  const permissionResult = await query<{ permission_type: PermissionType }>(
    'SELECT permission_type FROM robot_permissions WHERE robot_serial_number = $1 AND user_id = $2',
    [robotSerialNumber, userId]
  );

  if (permissionResult.rows.length > 0) {
    return permissionResult.rows[0].permission_type;
  }

  return null;
}

/**
 * Check if user has admin permission on a robot
 */
export async function hasAdminPermission(
  userId: number,
  robot: { serialNumber: string; ownerUserId: number | null; ownerGroupId: number | null }
): Promise<boolean> {
  // Owner always has admin
  if (robot.ownerUserId === userId) {
    return true;
  }

  // Check if user is group admin
  if (robot.ownerGroupId) {
    const groupResult = await query(
      'SELECT owner_id FROM groups WHERE id = $1',
      [robot.ownerGroupId]
    );

    if (groupResult.rows.length > 0 && groupResult.rows[0].owner_id === userId) {
      return true;
    }

    const membershipResult = await query(
      'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [robot.ownerGroupId, userId]
    );

    if (membershipResult.rows.length > 0 && membershipResult.rows[0].role === 'ADMIN') {
      return true;
    }
  }

  // Check if user has admin permission
  const permissionResult = await query(
    'SELECT permission_type FROM robot_permissions WHERE robot_serial_number = $1 AND user_id = $2',
    [robot.serialNumber, userId]
  );

  return permissionResult.rows.length > 0 && permissionResult.rows[0].permission_type === 'ADMIN';
}

/**
 * Get user's permission level on a robot (from already loaded data)
 */
export function getUserPermission(
  userId: number,
  robot: {
    owner_user_id: number | null;
    owner_group_id: number | null;
    assigned_user_id: number | null;
    permissions?: Array<{ user_id: number; permission_type: PermissionType }>;
  }
): PermissionType | null {
  // Owner has admin
  if (robot.owner_user_id === userId) {
    return 'ADMIN';
  }

  // Assigned user has usage
  if (robot.assigned_user_id === userId) {
    return 'USAGE';
  }

  // Check explicit permissions
  const permission = robot.permissions?.find(p => p.user_id === userId);
  if (permission) {
    return permission.permission_type;
  }

  return null;
}

/**
 * Format robot for API response
 */
export function formatRobot(robot: RobotRow, userId: number, permission?: PermissionType | null) {
  const ownerType = robot.owner_user_id ? 'user' : robot.owner_group_id ? 'group' : 'unknown';
  
  let owner = null;
  if (robot.owner_user_id) {
    owner = {
      type: 'user' as const,
      id: robot.owner_user_id,
      label: robot.owner_user_name || robot.owner_user_email || robot.owner_user_username || '',
    };
  } else if (robot.owner_group_id) {
    owner = {
      type: 'group' as const,
      id: robot.owner_group_id,
      label: robot.owner_group_name || '',
    };
  }

  const assignedUser = robot.assigned_user_id ? {
    id: robot.assigned_user_id,
    email: robot.assigned_user_email || '',
    username: robot.assigned_user_username || '',
    name: robot.assigned_user_name || null,
  } : null;

  return {
    serial_number: robot.serial_number,
    name: robot.name,
    model: robot.model,
    owner_type: ownerType,
    owner,
    assigned_user: assignedUser,
    permission: permission || null,
    created_at: robot.created_at,
    updated_at: robot.updated_at,
  };
}

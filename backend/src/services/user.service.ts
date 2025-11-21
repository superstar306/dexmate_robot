import { query } from '../lib/db.js';

export async function getUserStats(userId: number) {
  const [personalRobotsResult, assignedRobotsResult, groupsResult, ownedGroupsResult] = await Promise.all([
    query('SELECT COUNT(*) as count FROM robots WHERE owner_user_id = $1', [userId]),
    query('SELECT COUNT(*) as count FROM robots WHERE assigned_user_id = $1', [userId]),
    query('SELECT COUNT(*) as count FROM group_memberships WHERE user_id = $1', [userId]),
    query('SELECT COUNT(*) as count FROM groups WHERE owner_id = $1', [userId]),
  ]);

  const personalRobotsCount = parseInt(personalRobotsResult.rows[0].count);
  const assignedRobotsCount = parseInt(assignedRobotsResult.rows[0].count);
  const groupsCount = parseInt(groupsResult.rows[0].count);
  const ownedGroupsCount = parseInt(ownedGroupsResult.rows[0].count);

  // Count group robots (robots owned by groups the user is in)
  const userGroupsResult = await query(
    'SELECT group_id FROM group_memberships WHERE user_id = $1',
    [userId]
  );
  const groupIds = userGroupsResult.rows.map(r => r.group_id);

  let groupRobotsCount = 0;
  if (groupIds.length > 0) {
    const groupRobotsResult = await query(
      `SELECT COUNT(*) as count FROM robots WHERE owner_group_id = ANY($1::int[])`,
      [groupIds]
    );
    groupRobotsCount = parseInt(groupRobotsResult.rows[0].count);
  }

  return {
    personal_robots_count: personalRobotsCount,
    group_robots_count: groupRobotsCount,
    assigned_robots_count: assignedRobotsCount,
    groups_count: groupsCount,
    owned_groups_count: ownedGroupsCount,
  };
}

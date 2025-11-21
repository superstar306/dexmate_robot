export type UserRole = 'USER' | 'ADMIN';
export type PermissionType = 'USAGE' | 'ADMIN';
export type GroupRole = 'ADMIN' | 'MEMBER';

export interface User {
  id: number;
  email: string;
  username: string;
  name?: string | null;
  role: UserRole;
  isStaff: boolean;
  isSuperuser: boolean;
  isActive: boolean;
  dateJoined: Date;
}

export interface UserStats {
  personal_robots_count: number;
  group_robots_count: number;
  assigned_robots_count: number;
  groups_count: number;
  owned_groups_count: number;
}

export interface Robot {
  serial_number: string;
  name: string;
  model?: string | null;
  owner_type: 'user' | 'group';
  owner: {
    type: 'user' | 'group';
    id: number;
    label: string;
  } | null;
  assigned_user: User | null;
  permission: PermissionType | null;
  created_at: Date;
  updated_at: Date;
  permissions?: RobotPermission[];
}

export interface RobotPermission {
  id: number;
  user: User;
  permission_type: PermissionType;
  granted_by: User | null;
  created_at: Date;
}

export interface Group {
  id: number;
  name: string;
  owner: User;
  members: GroupMembership[];
  created_at: Date;
}

export interface GroupMembership {
  id: number;
  user: User;
  role: GroupRole;
  created_at: Date;
}

export interface AuthResponse {
  user: User & { stats?: UserStats };
  access: string;
  refresh: string;
}


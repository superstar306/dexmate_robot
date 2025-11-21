export type PermissionType = 'usage' | 'admin'

export type UserRole = 'user' | 'admin'

export interface User {
  id: number
  email: string
  username: string
  name?: string
  is_staff: boolean
  role: UserRole
  date_joined?: string
  stats?: UserStats
}

export interface UserStats {
  personal_robots_count: number
  group_robots_count: number
  assigned_robots_count: number
  groups_count: number
  owned_groups_count: number
}

export type UserProfile = User

export interface RobotOwnerMeta {
  type: 'user' | 'group'
  id: number
  label: string
}

export interface RobotPermission {
  id: number
  user: User
  permission_type: PermissionType
  granted_by: User | null
  created_at: string
}

export interface Robot {
  serial_number: string
  name: string
  model: string
  owner_type: 'user' | 'group'
  owner: RobotOwnerMeta | null
  assigned_user: User | null
  permission: PermissionType | null
  created_at: string
  updated_at: string
  permissions?: RobotPermission[]
}

export interface RobotSettingRecord {
  robot?: Robot
  settings: Record<string, unknown>
  updated_at?: string
}

export type GroupRole = 'admin' | 'member'

export interface GroupMembership {
  id: number
  user: User
  role: GroupRole
  created_at: string
}

export interface Group {
  id: number
  name: string
  owner: User
  members: GroupMembership[]
  created_at: string
}

export interface AuthResponse {
  user: User
  access: string
  refresh: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}


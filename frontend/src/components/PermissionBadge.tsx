import type { PermissionType } from '../api/types'

interface PermissionBadgeProps {
  permission: PermissionType | null
}

export function PermissionBadge({ permission }: PermissionBadgeProps) {
  if (!permission) {
    return <span className="badge">none</span>
  }

  const className = `badge ${permission}`
  return <span className={className}>{permission}</span>
}


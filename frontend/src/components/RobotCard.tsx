import { Link } from 'react-router-dom'

import type { Robot } from '../api/types'
import { PermissionBadge } from './PermissionBadge'

interface RobotCardProps {
  robot: Robot
}

export function RobotCard({ robot }: RobotCardProps) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <strong>{robot.name}</strong>
        <PermissionBadge permission={robot.permission ?? null} />
      </div>
      <div className="muted">S/N: {robot.serial_number}</div>
      <div className="muted">Model: {robot.model || 'n/a'}</div>
      <div className="muted">
        Owner: {robot.owner?.label ?? robot.owner_type.toUpperCase()}
      </div>
      <div className="muted">
        Assigned:{' '}
        {robot.assigned_user ? robot.assigned_user.name || robot.assigned_user.email : 'Unassigned'}
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <Link className="button" to={`/robots/${encodeURIComponent(robot.serial_number)}`}>
          View details
        </Link>
      </div>
    </div>
  )
}


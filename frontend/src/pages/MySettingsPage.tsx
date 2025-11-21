import { useQuery } from '@tanstack/react-query'

import { apiClient } from '../api/client'
import type { RobotSettingRecord } from '../api/types'
import { PermissionBadge } from '../components/PermissionBadge'

const SETTINGS_KEY = ['my-settings']

export function MySettingsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<RobotSettingRecord[]>('/robots/my-settings/')
      return response.data
    },
  })

  if (isLoading) {
    return <div className="card">Loading settings…</div>
  }

  if (error) {
    return <div className="card">Unable to load stored settings.</div>
  }

  if (!data || data.length === 0) {
    return <div className="card">No saved settings yet.</div>
  }

  return (
    <div className="grid gap">
      <h1 className="page-title">Saved Robot Profiles</h1>
      <div className="grid two">
        {data.map((record) => (
          <div className="card" key={record.robot?.serial_number}>
            <strong>{record.robot?.name}</strong>
            <div className="muted">Serial: {record.robot?.serial_number}</div>
            <div className="muted">
              Owner: {record.robot?.owner?.label ?? record.robot?.owner_type}
            </div>
            <PermissionBadge permission={record.robot?.permission ?? null} />
            <pre
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                borderRadius: '8px',
                padding: '0.75rem',
                marginTop: '0.75rem',
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(record.settings, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}


import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../api/client'
import type { PaginatedResponse, PermissionType, Robot } from '../api/types'
import { RobotCard } from '../components/RobotCard'

const ROBOT_LIST_KEY = ['robots']

function normalizeRobots(payload?: PaginatedResponse<Robot>): Robot[] {
  if (!payload || !payload.results || !Array.isArray(payload.results)) {
    return []
  }
  return payload.results
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const [createForm, setCreateForm] = useState({
    serialNumber: '',
    name: '',
    model: '',
  })
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ROBOT_LIST_KEY,
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Robot>>('/robots/')
      return response.data
    },
    staleTime: 10_000,
  })

  const createRobotMutation = useMutation({
    mutationFn: (payload: { serial_number: string; name: string; model?: string }) =>
      apiClient.post<Robot>('/robots/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROBOT_LIST_KEY })
      setCreateForm({ serialNumber: '', name: '', model: '' })
      setShowCreateForm(false)
    },
  })

  const robots = useMemo(() => normalizeRobots(data), [data])

  if (isLoading) {
    return <div className="card">Loading robots…</div>
  }

  if (error) {
    return <div className="card">Unable to load robots.</div>
  }

  const adminRobots = robots.filter(
    (robot) => robot.permission === ('admin' as PermissionType),
  )

  const handleCreateRobot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!createForm.serialNumber || !createForm.name) {
      return
    }
    createRobotMutation.mutate({
      serial_number: createForm.serialNumber,
      name: createForm.name,
      model: createForm.model || undefined,
    })
  }

  return (
    <div className="grid gap">
      <div>
        <h1 className="page-title">My Robots</h1>
        <p className="muted">
          View every robot you own, can access via group membership, or have been granted
          explicit permissions for.
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Create Personal Robot</h2>
          <button
            type="button"
            className="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : 'Create Robot'}
          </button>
        </div>
        {showCreateForm && (
          <form onSubmit={handleCreateRobot} style={{ marginTop: '1rem' }}>
            <div className="grid two">
              <div className="form-field">
                <label htmlFor="robot-serial">Serial Number *</label>
                <input
                  id="robot-serial"
                  value={createForm.serialNumber}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, serialNumber: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="robot-name">Name *</label>
                <input
                  id="robot-name"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="robot-model">Model (optional)</label>
              <input
                id="robot-model"
                value={createForm.model}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, model: event.target.value }))
                }
              />
            </div>
            <button type="submit" className="button" disabled={createRobotMutation.isPending}>
              {createRobotMutation.isPending ? 'Creating…' : 'Create Robot'}
            </button>
          </form>
        )}
      </div>
      <section>
        <h2>Admin Access</h2>
        {adminRobots.length === 0 ? (
          <p className="muted">No robots where you have admin access yet.</p>
        ) : (
          <div className="grid two">
            {adminRobots.map((robot) => (
              <RobotCard key={robot.serial_number} robot={robot} />
            ))}
          </div>
        )}
      </section>
      <section>
        <h2>All Robots</h2>
        {robots.length === 0 ? (
          <p className="muted">No robots available.</p>
        ) : (
          <div className="grid two">
            {robots.map((robot) => (
              <RobotCard key={robot.serial_number} robot={robot} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}


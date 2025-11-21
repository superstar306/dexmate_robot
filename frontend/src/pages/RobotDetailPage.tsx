import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'

import { apiClient } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type {
  Group,
  PaginatedResponse,
  Robot,
  RobotPermission,
  RobotSettingRecord,
  User,
} from '../api/types'
import { PermissionBadge } from '../components/PermissionBadge'
import { SettingsForm } from '../components/SettingsForm'

const robotKey = (serialNumber: string) => ['robot', serialNumber]
const robotSettingsKey = (serialNumber: string) => ['robot-settings', serialNumber]
const groupListKey = ['groups']
const usersListKey = ['users']

export function RobotDetailPage() {
  const { serialNumber = '' } = useParams<{ serialNumber: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Decode serial number from URL, but handle errors gracefully
  const decodedSerialNumber = useMemo(() => {
    if (!serialNumber) {
      return ''
    }
    try {
      // Try to decode - if it's already decoded, this will work fine
      return decodeURIComponent(serialNumber)
    } catch (error) {
      // If decoding fails (e.g., already decoded or malformed), use as-is
      console.warn('Failed to decode serial number, using as-is:', serialNumber, error)
      return serialNumber
    }
  }, [serialNumber])
  const queryClient = useQueryClient()
  const [permissionForm, setPermissionForm] = useState({
    userId: '',
    permissionType: 'usage',
  })
  const [assignUserId, setAssignUserId] = useState('')

  const robotQuery = useQuery({
    queryKey: robotKey(decodedSerialNumber),
    queryFn: async () => {
      const response = await apiClient.get<Robot>(`/robots/${decodedSerialNumber}/`)
      return response.data
    },
    enabled: Boolean(decodedSerialNumber),
  })

  const settingsQuery = useQuery({
    queryKey: robotSettingsKey(decodedSerialNumber),
    queryFn: async () => {
      const response = await apiClient.get<RobotSettingRecord>(
        `/robots/${decodedSerialNumber}/settings/`,
      )
      return response.data
    },
    enabled: Boolean(decodedSerialNumber),
  })

  const groupsQuery = useQuery({
    queryKey: groupListKey,
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Group>>('/groups/')
      return response.data.results
    },
    enabled: robotQuery.data?.owner?.type === 'group',
  })

  const usersQuery = useQuery({
    queryKey: usersListKey,
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/auth/users/')
      return response.data
    },
    enabled: robotQuery.data?.permission === 'admin' && Boolean(decodedSerialNumber),
  })

  const saveSettingsMutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      apiClient.put(`/robots/${decodedSerialNumber}/settings`, { settings }),
    onSuccess: (response) => {
      queryClient.setQueryData(robotSettingsKey(decodedSerialNumber), response.data)
      queryClient.invalidateQueries({ queryKey: robotSettingsKey(decodedSerialNumber) })
    },
  })

  const assignMutation = useMutation({
    mutationFn: (user_id: number) =>
      apiClient.post(`/robots/${decodedSerialNumber}/assign`, { user_id }),
    onSuccess: (response) => {
      queryClient.setQueryData(robotKey(decodedSerialNumber), response.data)
      queryClient.invalidateQueries({ queryKey: robotKey(decodedSerialNumber) })
      queryClient.invalidateQueries({ queryKey: ['robots'] })
    },
  })

  const permissionMutation = useMutation({
    mutationFn: (payload: { user_id: number; permission_type: string }) =>
      apiClient.post(`/robots/${decodedSerialNumber}/permissions`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: robotKey(decodedSerialNumber) })
    },
  })

  const revokePermissionMutation = useMutation({
    mutationFn: (userId: number) =>
      apiClient.delete(`/robots/${decodedSerialNumber}/permissions/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: robotKey(decodedSerialNumber) })
    },
  })

  const deleteRobotMutation = useMutation({
    mutationFn: () => apiClient.delete(`/robots/${decodedSerialNumber}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      // Navigate to dashboard after deletion
      window.location.href = '/dashboard'
    },
  })

  const groupMembers = useMemo(() => {
    if (!robotQuery.data?.owner || robotQuery.data.owner.type !== 'group') {
      return []
    }
    const groupId = robotQuery.data.owner.id
    const group = groupsQuery.data?.find((entry) => entry.id === groupId)
    return group?.members ?? []
  }, [groupsQuery.data, robotQuery.data])

  // All hooks must be called before any early returns
  const availableUsers = useMemo(() => {
    const robot = robotQuery.data
    if (!usersQuery.data || !robot) {
      return []
    }
    const existingPermissionUserIds = new Set(
      (robot.permissions ?? []).map((p: RobotPermission) => p.user.id),
    )
    const ownerUserId = robot.owner?.type === 'user' ? robot.owner.id : null
    return usersQuery.data.filter((user) => {
      if (ownerUserId && user.id === ownerUserId) {
        return false
      }
      if (existingPermissionUserIds.has(user.id)) {
        return false
      }
      return true
    })
  }, [usersQuery.data, robotQuery.data])

  const isOwner = useMemo(() => {
    const robot = robotQuery.data
    if (!robot || !user) return false
    const ownerId = robot.owner?.type === 'user' ? robot.owner.id : null
    return ownerId === user.id && robot.owner?.type === 'user'
  }, [robotQuery.data, user])

  // Handle authentication errors - redirect to login (must be before early returns)
  useEffect(() => {
    const error = robotQuery.error as any
    if (error?.response?.status === 401 || error?.message?.includes('401')) {
      // Small delay to allow user to see the error message
      const timer = setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [robotQuery.error, navigate])

  // Early returns after all hooks are called
  if (!decodedSerialNumber) {
    return (
      <div className="grid gap">
        <div className="card">
          <h2>Invalid Robot</h2>
          <p className="muted">No serial number provided.</p>
        </div>
      </div>
    )
  }

  if (robotQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="grid gap">
        <div className="card">Loading robot…</div>
      </div>
    )
  }

  if (robotQuery.error) {
    // Check if it's an authentication error
    const error = robotQuery.error as any
    const isAuthError =
      error?.response?.status === 401 ||
      error?.message?.includes('401') ||
      error?.message?.includes('Session expired') ||
      error?.message?.includes('Authentication expired')

    return (
      <div className="grid gap">
        <div className="card">
          <h2>Error loading robot</h2>
          {isAuthError ? (
            <>
              <p className="muted">
                Your session has expired or you don't have permission to view this robot.
              </p>
              <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Redirecting to login page...
              </p>
            </>
          ) : (
            <>
              <p className="muted">
                {robotQuery.error instanceof Error
                  ? robotQuery.error.message
                  : 'Unable to load robot details.'}
              </p>
              <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Serial number: {decodedSerialNumber}
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (settingsQuery.error) {
    return (
      <div className="grid gap">
        <div className="card">
          <h2>Error loading robot settings</h2>
          <p className="muted">
            {settingsQuery.error instanceof Error
              ? settingsQuery.error.message
              : 'Unable to load robot settings.'}
          </p>
        </div>
      </div>
    )
  }

  if (!robotQuery.data) {
    return (
      <div className="grid gap">
        <div className="card">
          <h2>Robot not found</h2>
          <p className="muted">The robot with serial number "{decodedSerialNumber}" could not be found.</p>
        </div>
      </div>
    )
  }

  const robot = robotQuery.data
  const canAdminister = robot.permission === 'admin'
  const settings = settingsQuery.data?.settings ?? {}

  const handleAssign = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Allow 0 to unassign
    if (assignUserId === '0') {
      assignMutation.mutate(0, {
        onSuccess: () => {
          setAssignUserId('')
        },
      })
      return
    }
    const numericId = Number(assignUserId)
    if (!Number.isFinite(numericId) || !assignUserId) {
      return
    }
    assignMutation.mutate(numericId, {
      onSuccess: () => {
        setAssignUserId('')
      },
    })
  }

  const handleGrantPermission = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numericId = Number(permissionForm.userId)
    if (!Number.isFinite(numericId) || !permissionForm.userId) {
      return
    }
    permissionMutation.mutate(
      {
        user_id: numericId,
        permission_type: permissionForm.permissionType,
      },
      {
        onSuccess: () => {
          setPermissionForm({ userId: '', permissionType: 'usage' })
        },
      },
    )
  }

  const handleRevokePermission = (userId: number) => {
    revokePermissionMutation.mutate(userId)
  }

  const handleDeleteRobot = () => {
    if (
      window.confirm(
        `Are you sure you want to delete robot "${robot.name}" (${robot.serial_number})? This action cannot be undone.`,
      )
    ) {
      deleteRobotMutation.mutate()
    }
  }

  const ownerLabel = robot.owner?.label ?? robot.owner_type.toUpperCase()
  const settingsSaving = saveSettingsMutation.isPending

  return (
    <div className="grid gap">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h1 className="page-title">{robot.name}</h1>
            <div className="muted">Serial Number: {robot.serial_number}</div>
            <div className="muted">Model: {robot.model || 'n/a'}</div>
            <div className="muted">Owner: {ownerLabel}</div>
            <div className="muted">
              Assigned:{' '}
              {robot.assigned_user
                ? robot.assigned_user.name || robot.assigned_user.email
                : 'None'}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <PermissionBadge permission={robot.permission ?? null} />
            </div>
          </div>
          {isOwner && (
            <button
              type="button"
              className="button destructive"
              onClick={handleDeleteRobot}
              disabled={deleteRobotMutation.isPending}
              style={{ marginLeft: '1rem', alignSelf: 'flex-start' }}
            >
              {deleteRobotMutation.isPending ? 'Deleting…' : 'Delete Robot'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Personal Settings</h2>
        <SettingsForm
          value={settings}
          saving={settingsSaving}
          onSave={async (payload) => {
            await saveSettingsMutation.mutateAsync(payload)
          }}
        />
      </div>

      {canAdminister ? (
        <>
          <div className="card">
            <h2>{robot.owner?.type === 'group' ? 'Assign to Member' : 'Assign to User'}</h2>
            {robot.owner?.type === 'group' ? (
              <form onSubmit={handleAssign}>
                <div className="form-field">
                  <label htmlFor="assign">Group Member</label>
                  <select
                    id="assign"
                    value={assignUserId}
                    onChange={(event) => setAssignUserId(event.target.value)}
                  >
                    <option value="">Select member</option>
                    {groupMembers.map((member) => (
                      <option key={member.id} value={member.user.id}>
                        {member.user.name || member.user.email} ({member.role})
                      </option>
                    ))}
                  </select>
                  {groupMembers.length === 0 && groupsQuery.data && (
                    <div className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                      No members in this group
                    </div>
                  )}
                </div>
                <button type="submit" className="button" disabled={assignMutation.isPending || !assignUserId}>
                  {assignMutation.isPending ? 'Assigning…' : 'Assign'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAssign}>
                <div className="form-field">
                  <label htmlFor="assign">User</label>
                  {usersQuery.isLoading ? (
                    <p className="muted">Loading users...</p>
                  ) : usersQuery.error ? (
                    <p className="muted" style={{ color: 'var(--error)' }}>
                      Error loading users. Please refresh the page.
                    </p>
                  ) : (
                    <>
                      <select
                        id="assign"
                        value={assignUserId}
                        onChange={(event) => setAssignUserId(event.target.value)}
                      >
                        <option value="">Select user</option>
                        <option value="0">Unassign (remove assignment)</option>
                        {usersQuery.data
                          ?.filter((user) => {
                            // Don't show the owner in the list
                            const ownerUserId = robot.owner?.type === 'user' ? robot.owner.id : null
                            return ownerUserId === null || user.id !== ownerUserId
                          })
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name || user.email} ({user.email})
                            </option>
                          ))}
                      </select>
                      {usersQuery.data && usersQuery.data.filter((u) => {
                        const ownerUserId = robot.owner?.type === 'user' ? robot.owner.id : null
                        return ownerUserId === null || u.id !== ownerUserId
                      }).length === 0 && (
                        <div className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                          No other users available
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button type="submit" className="button" disabled={assignMutation.isPending || !assignUserId || usersQuery.isLoading}>
                  {assignMutation.isPending ? 'Assigning…' : 'Assign'}
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <h2>Permissions</h2>
            <div className="grid">
              {(robot.permissions ?? [])
                .filter((permission: RobotPermission) => {
                  // Filter out owner - owners always have admin access and cannot be removed
                  const ownerId = robot.owner?.type === 'user' ? robot.owner.id : null
                  return ownerId === null || permission.user.id !== ownerId
                })
                .map((permission: RobotPermission) => (
                  <div
                    key={permission.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #e2e8f0',
                      padding: '0.4rem 0',
                    }}
                  >
                    <div>
                      <strong>{permission.user.name || permission.user.email}</strong>
                      <div className="muted">{permission.user.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <PermissionBadge permission={permission.permission_type} />
                      <button
                        type="button"
                        className="button destructive"
                        onClick={() => handleRevokePermission(permission.user.id)}
                        disabled={revokePermissionMutation.isPending}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            <h3>Grant permission</h3>
            <form onSubmit={handleGrantPermission}>
              <div className="form-field">
                <label htmlFor="permission-user">User</label>
                <select
                  id="permission-user"
                  value={permissionForm.userId}
                  onChange={(event) =>
                    setPermissionForm((prev) => ({
                      ...prev,
                      userId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select user</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} ({user.email})
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && usersQuery.data && (
                  <div className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                    All users already have permissions or are the owner
                  </div>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="permission-type">Permission</label>
                <select
                  id="permission-type"
                  value={permissionForm.permissionType}
                  onChange={(event) =>
                    setPermissionForm((prev) => ({
                      ...prev,
                      permissionType: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="usage">Usage</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                className="button"
                disabled={permissionMutation.isPending || !permissionForm.userId}
              >
                {permissionMutation.isPending ? 'Saving…' : 'Grant'}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  )
}


import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../api/client'
import type { Group, PaginatedResponse, Robot, User } from '../api/types'
import { PermissionBadge } from '../components/PermissionBadge'
import { useAuth } from '../context/AuthContext'

const GROUPS_KEY = ['groups']
const ROBOTS_KEY = ['robots']
const USERS_KEY = ['users']

function isAdminForGroup(group: Group, userId: number): boolean {
  if (group.owner.id === userId) {
    return true
  }
  let idx = 0
  while (idx < group.members.length) {
    const member = group.members[idx]
    if (member.user.id === userId && member.role === 'admin') {
      return true
    }
    idx += 1
  }
  return false
}

export function GroupAdminPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [memberForm, setMemberForm] = useState({
    userId: '',
    role: 'member',
  })
  const [assignForm, setAssignForm] = useState({
    serialNumber: '',
    userId: '',
  })
  const [permissionForm, setPermissionForm] = useState({
    serialNumber: '',
    userId: '',
    permissionType: 'usage',
  })
  const [createGroupForm, setCreateGroupForm] = useState({
    name: '',
  })
  const [createRobotForm, setCreateRobotForm] = useState({
    groupId: '',
    serialNumber: '',
    name: '',
    model: '',
  })

  const groupsQuery = useQuery({
    queryKey: GROUPS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Group>>('/groups/')
      return response.data.results
    },
  })

  const robotsQuery = useQuery({
    queryKey: ROBOTS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Robot>>('/robots/')
      return response.data.results
    },
  })

  const usersQuery = useQuery({
    queryKey: USERS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/auth/users/')
      return response.data
    },
  })

  const upsertMemberMutation = useMutation({
    mutationFn: (payload: { groupId: number; body: { user_id: number; role: string } }) =>
      apiClient.post(`/groups/${payload.groupId}/members`, payload.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_KEY })
      setMemberForm({ userId: '', role: 'member' })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (payload: { groupId: number; userId: number }) =>
      apiClient.delete(`/groups/${payload.groupId}/members/${payload.userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_KEY })
    },
  })

  const assignRobotMutation = useMutation({
    mutationFn: (payload: { serial: string; user_id: number }) =>
      apiClient.post(`/robots/${payload.serial}/assign/`, { user_id: payload.user_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROBOTS_KEY })
      setAssignForm({ serialNumber: '', userId: '' })
    },
  })

  const grantPermissionMutation = useMutation({
    mutationFn: (payload: { serial: string; user_id: number; permission_type: string }) =>
      apiClient.post(`/robots/${payload.serial}/permissions/`, {
        user_id: payload.user_id,
        permission_type: payload.permission_type,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROBOTS_KEY })
      setPermissionForm({ serialNumber: '', userId: '', permissionType: 'usage' })
    },
  })

  const createGroupMutation = useMutation({
    mutationFn: (payload: { name: string }) => apiClient.post<Group>('/groups/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_KEY })
      queryClient.invalidateQueries({ queryKey: ROBOTS_KEY })
      setCreateGroupForm({ name: '' })
    },
  })

  const createRobotMutation = useMutation({
    mutationFn: (payload: {
      serial_number: string
      name: string
      model?: string
      owner_group_id?: number
    }) => apiClient.post<Robot>('/robots/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROBOTS_KEY })
      setCreateRobotForm({ groupId: '', serialNumber: '', name: '', model: '' })
    },
  })

  const managedGroups = useMemo(() => {
    if (!groupsQuery.data || !user) {
      return []
    }
    return groupsQuery.data.filter((group) => isAdminForGroup(group, user.id))
  }, [groupsQuery.data, user])

  const groupRobots = useMemo(() => {
    const mapping = new Map<number, Robot[]>()
    if (!robotsQuery.data) {
      return mapping
    }
    let idx = 0
    while (idx < robotsQuery.data.length) {
      const robot = robotsQuery.data[idx]
      const groupId = robot.owner?.type === 'group' ? robot.owner.id : null
      if (groupId) {
        if (!mapping.has(groupId)) {
          mapping.set(groupId, [])
        }
        mapping.get(groupId)!.push(robot)
      }
      idx += 1
    }
    return mapping
  }, [robotsQuery.data])

  const handleMemberSubmit = (event: FormEvent<HTMLFormElement>, groupId: number) => {
    event.preventDefault()
    const userIdValue = Number(memberForm.userId)
    if (!Number.isFinite(userIdValue)) {
      return
    }
    upsertMemberMutation.mutate({
      groupId,
      body: { user_id: userIdValue, role: memberForm.role },
    })
  }

  const handleAssignRobot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const serial = assignForm.serialNumber
    const userIdValue = Number(assignForm.userId)
    if (!serial || !Number.isFinite(userIdValue)) {
      return
    }
    assignRobotMutation.mutate({ serial, user_id: userIdValue })
  }

  const handleGrantPermission = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const serial = permissionForm.serialNumber
    const userIdValue = Number(permissionForm.userId)
    if (!serial || !Number.isFinite(userIdValue)) {
      return
    }
    grantPermissionMutation.mutate({
      serial,
      user_id: userIdValue,
      permission_type: permissionForm.permissionType,
    })
  }

  const handleCreateGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!createGroupForm.name) {
      return
    }
    createGroupMutation.mutate({ name: createGroupForm.name })
  }

  const handleCreateRobot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const groupIdValue = Number(createRobotForm.groupId)
    if (!createRobotForm.serialNumber || !createRobotForm.name || !Number.isFinite(groupIdValue)) {
      return
    }
    createRobotMutation.mutate({
      serial_number: createRobotForm.serialNumber,
      name: createRobotForm.name,
      model: createRobotForm.model || undefined,
      owner_group_id: groupIdValue,
    })
  }

  if (groupsQuery.isLoading || robotsQuery.isLoading) {
    return <div className="card">Loading group data…</div>
  }

  if (groupsQuery.error) {
    return <div className="card">Unable to load groups.</div>
  }

  if (robotsQuery.error) {
    return <div className="card">Unable to load robots.</div>
  }

  return (
    <div className="grid gap">
      <h1 className="page-title">Group Management</h1>

      <div className="card">
        <h2>Create Group</h2>
        <form onSubmit={handleCreateGroup}>
          <div className="form-field">
            <label htmlFor="group-name">Group Name *</label>
            <input
              id="group-name"
              value={createGroupForm.name}
              onChange={(event) =>
                setCreateGroupForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </div>
          <button type="submit" className="button" disabled={createGroupMutation.isPending}>
            {createGroupMutation.isPending ? 'Creating…' : 'Create Group'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Create Group Robot</h2>
        <form onSubmit={handleCreateRobot}>
          <div className="form-field">
            <label htmlFor="robot-group">Group *</label>
            <select
              id="robot-group"
              value={createRobotForm.groupId}
              onChange={(event) =>
                setCreateRobotForm((prev) => ({ ...prev, groupId: event.target.value }))
              }
              required
            >
              <option value="">Select group</option>
              {managedGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid two">
            <div className="form-field">
              <label htmlFor="robot-serial-group">Serial Number *</label>
              <input
                id="robot-serial-group"
                value={createRobotForm.serialNumber}
                onChange={(event) =>
                  setCreateRobotForm((prev) => ({ ...prev, serialNumber: event.target.value }))
                }
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="robot-name-group">Name *</label>
              <input
                id="robot-name-group"
                value={createRobotForm.name}
                onChange={(event) =>
                  setCreateRobotForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="robot-model-group">Model (optional)</label>
            <input
              id="robot-model-group"
              value={createRobotForm.model}
              onChange={(event) =>
                setCreateRobotForm((prev) => ({ ...prev, model: event.target.value }))
              }
            />
          </div>
          <button type="submit" className="button" disabled={createRobotMutation.isPending}>
            {createRobotMutation.isPending ? 'Creating…' : 'Create Robot'}
          </button>
        </form>
      </div>

      {managedGroups.length === 0 ? (
        <div className="card">You are not an admin of any groups.</div>
      ) : (
        managedGroups.map((group) => (
          <div className="card" key={group.id}>
            <h2>{group.name}</h2>
            <h3>Members</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {group.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.user.name || member.user.email}</td>
                    <td>{member.user.email}</td>
                    <td>{member.role}</td>
                    <td>
                      {member.user.id !== group.owner.id ? (
                        <button
                          type='button'
                          className="button destructive"
                          onClick={() =>
                            removeMemberMutation.mutate({
                              groupId: group.id,
                              userId: member.user.id,
                            })
                          }
                          disabled={removeMemberMutation.isPending}
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4>Add / Update Member</h4>
            {usersQuery.isLoading ? (
              <p className="muted">Loading users...</p>
            ) : usersQuery.error ? (
              <p className="muted" style={{ color: 'var(--error)' }}>
                Error loading users. Please refresh the page.
              </p>
            ) : (
              <form onSubmit={(event) => handleMemberSubmit(event, group.id)}>
                <div className="grid two">
                  <div className="form-field">
                    <label htmlFor={`member-user-${group.id}`}>User</label>
                    <select
                      id={`member-user-${group.id}`}
                      value={memberForm.userId}
                      onChange={(event) =>
                        setMemberForm((prev) => ({ ...prev, userId: event.target.value }))
                      }
                      required
                    >
                      <option value="">Select user</option>
                      {usersQuery.data
                        ?.filter((u) => {
                          // Filter out users already in the group
                          return !group.members.some((m) => m.user.id === u.id)
                        })
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email} ({user.email})
                          </option>
                        ))}
                    </select>
                    {usersQuery.data && usersQuery.data.filter((u) => !group.members.some((m) => m.user.id === u.id)).length === 0 && (
                      <div className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                        All users are already members of this group
                      </div>
                    )}
                  </div>
                  <div className="form-field">
                    <label htmlFor={`member-role-${group.id}`}>Role</label>
                    <select
                      id={`member-role-${group.id}`}
                      value={memberForm.role}
                      onChange={(event) =>
                        setMemberForm((prev) => ({ ...prev, role: event.target.value }))
                      }
                      required
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="button" disabled={upsertMemberMutation.isPending || !memberForm.userId}>
                  {upsertMemberMutation.isPending ? 'Saving…' : 'Add Member'}
                </button>
              </form>
            )}

            <h3 style={{ marginTop: '1.5rem' }}>Robots</h3>
            {(groupRobots.get(group.id) ?? []).length === 0 ? (
              <p className="muted">No robots in this group yet.</p>
            ) : (
              <div className="grid two">
                {(groupRobots.get(group.id) ?? []).map((robot) => (
                  <div key={robot.serial_number} className="card">
                    <strong>{robot.name}</strong>
                    <div className="muted">S/N: {robot.serial_number}</div>
                    <div className="muted">
                      Assigned:{' '}
                      {robot.assigned_user
                        ? robot.assigned_user.name || robot.assigned_user.email
                        : 'None'}
                    </div>
                    <PermissionBadge permission={robot.permission ?? null} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      <div className="card">
        <h3>Assign Robot to Member</h3>
        {managedGroups.length === 0 ? (
          <p className="muted">You need to be an admin of at least one group to assign robots.</p>
        ) : (
          <form onSubmit={handleAssignRobot}>
            <div className="grid two">
              <div className="form-field">
                <label htmlFor="assign-serial">Group Robot</label>
                <select
                  id="assign-serial"
                  value={assignForm.serialNumber}
                  onChange={(event) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      serialNumber: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select robot</option>
                  {managedGroups.flatMap((group) => {
                    const robots = groupRobots.get(group.id) ?? []
                    return robots.map((robot) => (
                      <option key={robot.serial_number} value={robot.serial_number}>
                        {robot.name} (S/N: {robot.serial_number}) - {group.name}
                      </option>
                    ))
                  })}
                </select>
                {managedGroups.flatMap((group) => groupRobots.get(group.id) ?? []).length === 0 && (
                  <div className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                    No group robots available. Create a robot for your group first.
                  </div>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="assign-user">Group Member</label>
                <select
                  id="assign-user"
                  value={assignForm.userId}
                  onChange={(event) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      userId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select member</option>
                  {managedGroups.flatMap((group) =>
                    group.members.map((member) => (
                      <option key={`${group.id}-${member.user.id}`} value={member.user.id}>
                        {member.user.name || member.user.email} ({group.name}, {member.role})
                      </option>
                    )),
                  )}
                </select>
                {managedGroups.flatMap((group) => group.members).length === 0 && (
                  <div className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                    No members in your groups. Add members to groups first.
                  </div>
                )}
              </div>
            </div>
            <button
              type="submit"
              className="button"
              disabled={assignRobotMutation.isPending || !assignForm.serialNumber || !assignForm.userId}
            >
              {assignRobotMutation.isPending ? 'Assigning…' : 'Assign'}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h3>Grant Robot Permission</h3>
        <form onSubmit={handleGrantPermission}>
          <div className="grid two">
            <div className="form-field">
              <label htmlFor="perm-serial">Group Robot</label>
              <select
                id="perm-serial"
                value={permissionForm.serialNumber}
                onChange={(event) =>
                  setPermissionForm((prev) => ({
                    ...prev,
                    serialNumber: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select robot</option>
                {managedGroups.flatMap((group) => {
                  const robots = groupRobots.get(group.id) ?? []
                  return robots.map((robot) => (
                    <option key={robot.serial_number} value={robot.serial_number}>
                      {robot.name} (S/N: {robot.serial_number}) - {group.name}
                    </option>
                  ))
                })}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="perm-user">User</label>
              <select
                id="perm-user"
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
                {usersQuery.data?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="perm-type">Permission</label>
            <select
              id="perm-type"
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
            disabled={grantPermissionMutation.isPending || !permissionForm.serialNumber || !permissionForm.userId}
          >
            {grantPermissionMutation.isPending ? 'Saving…' : 'Grant'}
          </button>
        </form>
      </div>
    </div>
  )
}


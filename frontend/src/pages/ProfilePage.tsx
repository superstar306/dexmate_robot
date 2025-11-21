import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../api/client'
import type { UserProfile } from '../api/types'
import { useAuth } from '../context/AuthContext'

const PROFILE_KEY = ['profile']

export function ProfilePage() {
  const { user: cachedUser, refreshProfile } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    name: '',
    role: 'user' as 'user' | 'admin',
  })
  const [formError, setFormError] = useState<string | null>(null)

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async () => {
      const response = await apiClient.get<UserProfile>('/auth/me')
      return response.data
    },
    staleTime: 30_000,
    enabled: !!cachedUser,
  })

  // Update form data when profile is loaded (replaces deprecated onSuccess)
  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        username: profile.username || '',
        name: profile.name || '',
        role: profile.role || 'user',
      })
    }
  }, [profile])

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { email?: string; username?: string; name?: string }) =>
      apiClient.patch<UserProfile>('/auth/me', payload),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_KEY, data.data)
      refreshProfile()
      setIsEditing(false)
      setFormError(null)
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } }
        const data = axiosError.response?.data
        if (data && typeof data === 'object') {
          if ('detail' in data && typeof data.detail === 'string') {
            setFormError(data.detail)
            return
          }
          if ('email' in data && Array.isArray(data.email)) {
            setFormError(`Email: ${data.email[0]}`)
            return
          }
          if ('username' in data && Array.isArray(data.username)) {
            setFormError(`Username: ${data.username[0]}`)
            return
          }
        }
      }
      setFormError('Failed to update profile. Please try again.')
    },
  })

  const displayUser = profile || cachedUser

  const handleEdit = () => {
    if (displayUser) {
      setFormData({
        email: displayUser.email || '',
        username: displayUser.username || '',
        name: displayUser.name || '',
        role: displayUser.role || 'user',
      })
      setIsEditing(true)
      setFormError(null)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        username: profile.username || '',
        name: profile.name || '',
        role: profile.role || 'user',
      })
    }
    setIsEditing(false)
    setFormError(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload: { email?: string; username?: string; name?: string; role?: string } = {}
    if (formData.email && formData.email !== displayUser?.email) {
      payload.email = formData.email
    }
    if (formData.username && formData.username !== displayUser?.username) {
      payload.username = formData.username
    }
    if (formData.name !== displayUser?.name) {
      payload.name = formData.name || ''
    }
    if ((displayUser?.role === 'admin' || displayUser?.is_staff) && formData.role !== displayUser?.role) {
      payload.role = formData.role
    }
    if (Object.keys(payload).length > 0) {
      updateProfileMutation.mutate(payload)
    } else {
      setIsEditing(false)
    }
  }

  if (!cachedUser) {
    return (
      <div className="grid gap">
        <div className="card">Loading profile…</div>
      </div>
    )
  }

  if (isLoading && cachedUser) {
    return <div className="card">Loading profile…</div>
  }

  if (error) {
    return (
      <div className="card">
        <p>Unable to load profile.</p>
        <button className="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    )
  }

  if (!displayUser) {
    return <div className="card">Profile not available.</div>
  }

  const stats = profile?.stats

  return (
    <div className="grid gap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">My Profile</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isEditing ? (
            <>
              <button className="button" onClick={handleEdit}>
                Edit Profile
              </button>
              <button className="button secondary" onClick={() => refreshProfile()}>
                Refresh
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="card">
        <h2>Personal Information</h2>
        {isEditing ? (
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            {formError ? (
              <div style={{ color: '#dc2626', marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '8px' }}>
                {formError}
              </div>
            ) : null}
            <div className="grid two">
              <div className="form-field">
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="profile-username">Username</label>
                <input
                  id="profile-username"
                  type="text"
                  value={formData.username}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, username: event.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              {displayUser && (displayUser.role === 'admin' || displayUser.is_staff) ? (
                <div className="form-field">
                  <label htmlFor="profile-role">Application Role</label>
                  <select
                    id="profile-role"
                    value={formData.role || displayUser.role || 'user'}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, role: event.target.value as 'user' | 'admin' }))
                    }
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="submit"
                className="button"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={handleCancel}
                disabled={updateProfileMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid two" style={{ marginTop: '1rem' }}>
            <div>
              <div className="muted">Email</div>
              <div style={{ marginTop: '0.25rem' }}>{displayUser.email}</div>
            </div>
            <div>
              <div className="muted">Username</div>
              <div style={{ marginTop: '0.25rem' }}>{displayUser.username}</div>
            </div>
            {displayUser.name ? (
              <div>
                <div className="muted">Name</div>
                <div style={{ marginTop: '0.25rem' }}>{displayUser.name}</div>
              </div>
            ) : null}
            <div>
              <div className="muted">User ID</div>
              <div style={{ marginTop: '0.25rem' }}>{displayUser.id}</div>
            </div>
            {displayUser.date_joined ? (
              <div>
                <div className="muted">Member Since</div>
                <div style={{ marginTop: '0.25rem' }}>
                  {new Date(displayUser.date_joined).toLocaleDateString()}
                </div>
              </div>
            ) : null}
            <div>
              <div className="muted">Django Admin</div>
              <div style={{ marginTop: '0.25rem' }}>
                {displayUser.is_staff ? 'Yes' : 'No'}
              </div>
            </div>
            <div>
              <div className="muted">Application Role</div>
              <div style={{ marginTop: '0.25rem' }}>
                {displayUser.role === 'admin' ? 'Admin' : 'User'}
              </div>
            </div>
          </div>
        )}
      </div>

      {stats ? (
        <div className="card">
          <h2>Statistics</h2>
          <div className="grid two" style={{ marginTop: '1rem' }}>
            <div>
              <div className="muted">Personal Robots</div>
              <div style={{ marginTop: '0.25rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {stats.personal_robots_count}
              </div>
            </div>
            <div>
              <div className="muted">Assigned Robots</div>
              <div style={{ marginTop: '0.25rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {stats.assigned_robots_count}
              </div>
            </div>
            <div>
              <div className="muted">Groups I'm In</div>
              <div style={{ marginTop: '0.25rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {stats.groups_count}
              </div>
            </div>
            <div>
              <div className="muted">Groups I Own</div>
              <div style={{ marginTop: '0.25rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {stats.owned_groups_count}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


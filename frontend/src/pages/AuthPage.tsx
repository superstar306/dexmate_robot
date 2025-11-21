import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export function AuthPage() {
  const { login, register, user } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    name: '',
    username: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await login({ email: formState.email, password: formState.password })
      } else {
        await register({
          email: formState.email,
          password: formState.password,
          name: formState.name || undefined,
          username: formState.username || undefined,
        })
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Authentication failed. Try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={formState.email}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </div>
          {mode === 'register' ? (
            <>
              <div className="form-field">
                <label htmlFor="name">Display name</label>
                <input
                  id="name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  value={formState.username}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                />
              </div>
            </>
          ) : null}
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={formState.password}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </div>
          {error ? (
            <div style={{ 
              color: '#dc2626', 
              marginBottom: '1rem',
              padding: '0.75rem',
              background: '#fee2e2',
              borderRadius: '8px',
              fontSize: '0.9rem',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          ) : null}
          <button type="submit" className="button" disabled={submitting} style={{ width: '100%', marginTop: '0.5rem' }}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
        <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', textAlign: 'center', color: '#64748b' }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setMode('register')
                  setError(null)
                }}
                style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
                style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


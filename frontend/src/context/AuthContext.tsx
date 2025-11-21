import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import { apiClient, clearAuthTokens, setAuthTokens } from '../api/client'
import type { AuthResponse, User } from '../api/types'
import { readTokens } from '../lib/tokenStorage'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (payload: { email: string; password: string }) => Promise<void>
  register: (payload: {
    email: string
    password: string
    username?: string
    name?: string
  }) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: unknown } }
    const data = axiosError.response?.data
    if (data && typeof data === 'object') {
      if ('detail' in data && typeof data.detail === 'string') {
        return data.detail
      }
      if ('non_field_errors' in data) {
        const nfe = data.non_field_errors
        if (Array.isArray(nfe) && nfe.length > 0) {
          return nfe[0]
        }
      }
      const fieldErrors: string[] = []
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0) {
          fieldErrors.push(`${key}: ${value[0]}`)
        } else if (typeof value === 'string') {
          fieldErrors.push(`${key}: ${value}`)
        }
      }
      if (fieldErrors.length > 0) {
        return fieldErrors.join(', ')
      }
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = readTokens()
    if (!stored) {
      setLoading(false)
      return
    }
    setAuthTokens(stored)
    apiClient
      .get<User>('/auth/me')
      .then((response) => {
        setUser(response.data)
      })
      .catch(() => {
        clearAuthTokens()
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleAuthSuccess = useCallback((data: AuthResponse) => {
    setAuthTokens({ access: data.access, refresh: data.refresh })
    setUser(data.user)
  }, [])

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      try {
        const response = await apiClient.post<AuthResponse>('/auth/login', payload)
        handleAuthSuccess(response.data)
      } catch (error) {
        throw new Error(extractErrorMessage(error))
      }
    },
    [handleAuthSuccess],
  )

  const register = useCallback(
    async (payload: {
      email: string
      password: string
      username?: string
      name?: string
    }) => {
      try {
        const response = await apiClient.post<AuthResponse>('/auth/register', payload)
        handleAuthSuccess(response.data)
      } catch (error) {
        throw new Error(extractErrorMessage(error))
      }
    },
    [handleAuthSuccess],
  )

  const logout = useCallback(() => {
    clearAuthTokens()
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const response = await apiClient.get<User>('/auth/me')
    setUser(response.data)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, loading, login, register, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}


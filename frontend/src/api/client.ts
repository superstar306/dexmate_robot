import axios, { type AxiosRequestConfig } from 'axios'

import type { AuthTokens } from '../lib/tokenStorage'
import { persistTokens, readTokens } from '../lib/tokenStorage'

// API Base URL configuration
// In development: uses /api proxy if VITE_API_URL is not set
// In production: requires VITE_API_URL to be set (e.g., https://your-railway-app.railway.app/api)
const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL
  
  if (envUrl) {
    // Use the provided URL as-is (should already include /api if needed)
    // Remove trailing slashes for consistency
    return envUrl.replace(/\/+$/, '')
  }
  
  if (import.meta.env.DEV) {
    // Development mode: use proxy
    return '/api'
  }
  
  // Production mode: VITE_API_URL should be set
  console.error(
    'VITE_API_URL environment variable is required in production. ' +
    'Please set it in your Vercel environment variables. ' +
    'Example: https://your-railway-app.railway.app/api'
  )
  // Fallback to prevent complete failure, but log error
  return '/api'
}

const API_BASE = getApiBase()

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean }

let tokens: AuthTokens | null = readTokens()
let refreshPromise: Promise<string> | null = null

export function setAuthTokens(next: AuthTokens | null): void {
  tokens = next
  persistTokens(next)
}

export function getAuthTokens(): AuthTokens | null {
  return tokens
}

export function clearAuthTokens(): void {
  tokens = null
  persistTokens(null)
}

async function refreshAccessToken(): Promise<string> {
  // Always read fresh tokens from storage
  const currentTokens = readTokens()
  if (!currentTokens?.refresh) {
    throw new Error('Missing refresh token')
  }
  tokens = currentTokens // Update module-level variable
  
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access: string; refresh?: string }>(`${API_BASE}/auth/refresh`, {
        refresh: currentTokens.refresh,
      })
      .then((response) => {
        // Handle token rotation - backend may return a new refresh token
        const updated: AuthTokens = {
          access: response.data.access,
          refresh: response.data.refresh || currentTokens.refresh, // Use new refresh token if provided
        }
        setAuthTokens(updated)
        return updated.access
      })
      .catch((error) => {
        // Clear tokens if refresh fails
        clearAuthTokens()
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  // Always read fresh tokens from storage in case they were updated elsewhere
  const currentTokens = readTokens()
  if (currentTokens) {
    tokens = currentTokens
  }
  
  if (tokens?.access) {
    config.headers = config.headers ?? {}
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${tokens.access}`)
    } else {
      ;(config.headers as Record<string, unknown>).Authorization = `Bearer ${tokens.access}`
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const originalRequest = error.config as RetriableConfig | undefined

    if (status === 401 && originalRequest && !originalRequest._retry) {
      // Always read fresh tokens from storage first
      const currentTokens = readTokens()
      tokens = currentTokens // Update module-level variable
      
      if (!currentTokens?.refresh) {
        clearAuthTokens()
        // Redirect to login if we're in browser
        if (typeof window !== 'undefined' && originalRequest.url !== '/auth/me') {
          window.location.href = '/login'
        }
        return Promise.reject(new Error('Authentication expired. Please log in again.'))
      }
      
      try {
        
        const newAccess = await refreshAccessToken()
        originalRequest._retry = true
        const headers = originalRequest.headers ?? {}
        if (typeof headers.set === 'function') {
          headers.set('Authorization', `Bearer ${newAccess}`)
        }
        return apiClient.request({
          ...originalRequest,
          headers:
            typeof headers.set === 'function'
              ? headers
              : {
                  ...(headers as Record<string, unknown>),
                  Authorization: `Bearer ${newAccess}`,
                },
        })
      } catch (refreshError) {
        clearAuthTokens()
        // Redirect to login if refresh fails
        if (typeof window !== 'undefined' && originalRequest?.url !== '/auth/me/') {
          window.location.href = '/login'
        }
        return Promise.reject(new Error('Session expired. Please log in again.'))
      }
    }

    // If 401 and no refresh token or refresh failed, clear tokens
    if (status === 401 && (!tokens?.refresh || originalRequest?._retry)) {
      clearAuthTokens()
      if (typeof window !== 'undefined' && originalRequest?.url !== '/auth/me/') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)


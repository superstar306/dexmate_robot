export type AuthTokens = {
  access: string
  refresh: string
}

const STORAGE_KEY = 'robot-manager-auth'

const hasWindow = typeof window !== 'undefined'

export function readTokens(): AuthTokens | null {
  if (!hasWindow) {
    return null
  }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as AuthTokens
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function persistTokens(tokens: AuthTokens | null): void {
  if (!hasWindow) {
    return
  }
  if (!tokens) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}


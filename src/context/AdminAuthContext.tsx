import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'ff-app:admin-authenticated'

function readStoredAuth(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeStoredAuth(value: boolean): void {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, 'true')
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // sessionStorage unavailable (e.g. private browsing) - auth just won't survive a refresh.
  }
}

export interface AdminAuthContextValue {
  isAuthenticated: boolean
  /** Returns whether the password matched. */
  login: (password: string) => boolean
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readStoredAuth)

  const login = useCallback((password: string): boolean => {
    const expected = import.meta.env.VITE_ADMIN_PASSWORD
    if (!expected || password !== expected) return false
    writeStoredAuth(true)
    setIsAuthenticated(true)
    return true
  }, [])

  const logout = useCallback(() => {
    writeStoredAuth(false)
    setIsAuthenticated(false)
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

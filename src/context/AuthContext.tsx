import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import { getStoredUser, login as loginRequest, logout as logoutRequest, type LoginResult } from '../services/auth'
import type { PlayerName } from '../utils/playerNames'

export interface AuthContextValue {
  user: PlayerName | null
  login: (password: string) => Promise<LoginResult>
  logout: () => void
}

// Kept in context (not a bare hook with its own useState) so every component that calls
// useAuth() - NavHeader, the route guard, each page - agrees on who's logged in.
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlayerName | null>(getStoredUser)

  const login = useCallback(async (password: string): Promise<LoginResult> => {
    const result = await loginRequest(password)
    if (result.user) setUser(result.user)
    return result
  }, [])

  const logout = useCallback(() => {
    logoutRequest()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

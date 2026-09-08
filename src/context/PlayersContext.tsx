import { createContext, useContext, type ReactNode } from 'react'
import { useSleeperPlayers, type UseSleeperPlayersResult } from '../hooks/useSleeperPlayers'

const PlayersContext = createContext<UseSleeperPlayersResult | undefined>(undefined)

export function PlayersProvider({ children }: { children: ReactNode }) {
  const result = useSleeperPlayers()
  return <PlayersContext.Provider value={result}>{children}</PlayersContext.Provider>
}

/** The Sleeper player pool loaded once at app start, available to any page/component. */
export function usePlayers(): UseSleeperPlayersResult {
  const context = useContext(PlayersContext)
  if (!context) {
    throw new Error('usePlayers must be used within a PlayersProvider')
  }
  return context
}

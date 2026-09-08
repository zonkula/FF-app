import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePlayers } from '../context/PlayersContext'
import { DraftProvider } from '../context/DraftContext'
import { ErrorBoundary } from './ErrorBoundary'

/**
 * Gates the player-facing pages: redirects to /login if not authenticated, then waits for the
 * Sleeper player pool to load before mounting DraftProvider (which every one of those pages
 * needs). /admin and /login sit outside this - they don't need a logged-in player or the
 * player pool at all.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { players, loading, error } = usePlayers()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (error) {
    return (
      <p className="mx-auto max-w-md p-8 text-center text-sm text-red-400">
        Couldn't load players from Sleeper: {error}
      </p>
    )
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-gray-400">Loading players from Sleeper...</p>
  }

  return (
    <ErrorBoundary>
      <DraftProvider players={players}>{children}</DraftProvider>
    </ErrorBoundary>
  )
}

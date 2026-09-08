import { DraftProvider } from '../context/DraftContext'
import { usePlayers } from '../context/PlayersContext'
import { DraftBoard } from '../components/DraftBoard'
import { ErrorBoundary } from '../components/ErrorBoundary'

export function DraftPage() {
  const { players, loading, error } = usePlayers()

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
      <DraftProvider players={players}>
        <DraftBoard />
      </DraftProvider>
    </ErrorBoundary>
  )
}

import { DraftProvider } from './context/DraftContext'
import { DraftBoard } from './components/DraftBoard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useSleeperPlayers } from './hooks/useSleeperPlayers'

function App() {
  const { players, season, week, loading, error } = useSleeperPlayers()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 p-4 text-center">
        <h1 className="text-2xl font-bold">FF App — 1v1 Weekly Draft (PPR)</h1>
      </header>

      {error ? (
        <p className="mx-auto max-w-md p-8 text-center text-sm text-red-400">
          Couldn't load players from Sleeper: {error}
        </p>
      ) : loading || week == null ? (
        <p className="p-8 text-center text-sm text-gray-400">Loading players from Sleeper...</p>
      ) : (
        <ErrorBoundary>
          <DraftProvider players={players}>
            <DraftBoard season={season} week={week} />
          </DraftProvider>
        </ErrorBoundary>
      )}
    </div>
  )
}

export default App

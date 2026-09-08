import { DraftProvider } from './context/DraftContext'
import { PlayersProvider, usePlayers } from './context/PlayersContext'
import { DraftBoard } from './components/DraftBoard'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 p-4 text-center">
        <h1 className="text-2xl font-bold">FF App — 1v1 Weekly Draft (PPR)</h1>
      </header>

      <PlayersProvider>
        <AppContent />
      </PlayersProvider>
    </div>
  )
}

function AppContent() {
  const { players, week, loading, error } = usePlayers()

  if (error) {
    return (
      <p className="mx-auto max-w-md p-8 text-center text-sm text-red-400">
        Couldn't load players from Sleeper: {error}
      </p>
    )
  }

  if (loading || week == null) {
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

export default App

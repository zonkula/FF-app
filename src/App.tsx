import { AdminAuthProvider } from './context/AdminAuthContext'
import { PlayersProvider, usePlayers } from './context/PlayersContext'
import { DraftProvider } from './context/DraftContext'
import { NavHeader } from './components/NavHeader'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './routes/AppRoutes'

function App() {
  return (
    <AdminAuthProvider>
      <PlayersProvider>
        <div className="min-h-screen bg-gray-950 text-white">
          <NavHeader />
          <AppContent />
        </div>
      </PlayersProvider>
    </AdminAuthProvider>
  )
}

// DraftProvider wraps every routed page (not just /draft) so /waiver, /roster, etc. all share the
// one live subscription to this week's draft instead of each opening a separate connection.
function AppContent() {
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
        <AppRoutes />
      </DraftProvider>
    </ErrorBoundary>
  )
}

export default App

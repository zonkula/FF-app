import { AdminAuthProvider } from './context/AdminAuthContext'
import { PlayersProvider } from './context/PlayersContext'
import { NavHeader } from './components/NavHeader'
import { AppRoutes } from './routes/AppRoutes'

function App() {
  return (
    <AdminAuthProvider>
      <PlayersProvider>
        <div className="min-h-screen bg-gray-950 text-white">
          <NavHeader />
          <AppRoutes />
        </div>
      </PlayersProvider>
    </AdminAuthProvider>
  )
}

export default App

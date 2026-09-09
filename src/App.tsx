import { AdminAuthProvider } from './context/AdminAuthContext'
import { AuthProvider } from './context/AuthContext'
import { PlayersProvider } from './context/PlayersContext'
import { NavHeader } from './components/NavHeader'
import { AppRoutes } from './routes/AppRoutes'

function App() {
  return (
    <AdminAuthProvider>
      <AuthProvider>
        <PlayersProvider>
          <div className="min-h-screen bg-slate-900 text-white">
            <NavHeader />
            <AppRoutes />
          </div>
        </PlayersProvider>
      </AuthProvider>
    </AdminAuthProvider>
  )
}

export default App

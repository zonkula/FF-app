import { NavLink } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useAuth } from '../hooks/useAuth'

function linkClassName({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-sky-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
  }`
}

export function NavHeader() {
  const { isAuthenticated: isAdmin } = useAdminAuth()
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-gray-800 p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-center text-xl font-bold sm:text-left">Zonk vs Brakke </h1>
        <nav className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
          {user && (
            <>
              <NavLink to="/draft" className={linkClassName}>
                Draft
              </NavLink>
              <NavLink to="/waiver" className={linkClassName}>
                Waiver
              </NavLink>
              <NavLink to="/matchup" className={linkClassName}>
                Matchup
              </NavLink>
              <NavLink to="/standings" className={linkClassName}>
                Standings
              </NavLink>
              <NavLink to="/roster" className={linkClassName}>
                Roster
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClassName}>
              Admin
            </NavLink>
          )}
          {user && (
            <div className="ml-2 flex items-center gap-2 border-l border-gray-800 pl-3">
              <span className="text-sm text-gray-400">
                Logged in as <span className="font-semibold text-gray-200">{user}</span>
              </span>
              <button
                onClick={logout}
                className="rounded-md border border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

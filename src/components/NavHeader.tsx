import { NavLink } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

function linkClassName({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-sky-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
  }`
}

export function NavHeader() {
  const { isAuthenticated } = useAdminAuth()

  return (
    <header className="border-b border-gray-800 p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-center text-xl font-bold sm:text-left">FF App — 1v1 Weekly Draft (PPR)</h1>
        <nav className="flex flex-wrap justify-center gap-1 sm:justify-end">
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
          {isAuthenticated && (
            <NavLink to="/admin" className={linkClassName}>
              Admin
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}

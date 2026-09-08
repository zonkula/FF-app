import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useAuth } from '../hooks/useAuth'

function desktopLinkClassName({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-sky-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
  }`
}

function mobileLinkClassName({ isActive }: { isActive: boolean }): string {
  return `flex min-h-[48px] items-center rounded-md px-3 text-base font-medium ${
    isActive ? 'bg-sky-600 text-white' : 'text-gray-300 hover:bg-gray-800'
  }`
}

export function NavHeader() {
  const { isAuthenticated: isAdmin } = useAdminAuth()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile menu whenever the route changes (e.g. after tapping a link).
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="border-b border-gray-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <h1 className="text-xl font-bold">Zonk vs Brakke </h1>

        {/* Desktop/tablet nav - hidden below the sm breakpoint. */}
        <nav className="hidden items-center gap-1 sm:flex">
          {user && (
            <>
              <NavLink to="/draft" className={desktopLinkClassName}>
                Draft
              </NavLink>
              <NavLink to="/waiver" className={desktopLinkClassName}>
                Waiver
              </NavLink>
              <NavLink to="/matchup" className={desktopLinkClassName}>
                Matchup
              </NavLink>
              <NavLink to="/standings" className={desktopLinkClassName}>
                Standings
              </NavLink>
              <NavLink to="/roster" className={desktopLinkClassName}>
                Roster
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={desktopLinkClassName}>
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

        {/* Hamburger toggle - only shown below the sm breakpoint, and only when there's
            actually something to show in the menu. A 48px tap target. */}
        {(user || isAdmin) && (
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="flex h-12 w-12 items-center justify-center rounded-md text-2xl text-gray-300 hover:bg-gray-800 sm:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        )}
      </div>

      {/* Mobile dropdown menu. */}
      {menuOpen && (user || isAdmin) && (
        <nav className="flex flex-col gap-1 border-t border-gray-800 p-3 sm:hidden">
          {user && (
            <>
              <NavLink to="/draft" className={mobileLinkClassName}>
                Draft
              </NavLink>
              <NavLink to="/waiver" className={mobileLinkClassName}>
                Waiver
              </NavLink>
              <NavLink to="/matchup" className={mobileLinkClassName}>
                Matchup
              </NavLink>
              <NavLink to="/standings" className={mobileLinkClassName}>
                Standings
              </NavLink>
              <NavLink to="/roster" className={mobileLinkClassName}>
                Roster
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={mobileLinkClassName}>
              Admin
            </NavLink>
          )}
          {user && (
            <div className="mt-2 flex items-center justify-between border-t border-gray-800 pt-3">
              <span className="text-sm text-gray-400">
                Logged in as <span className="font-semibold text-gray-200">{user}</span>
              </span>
              <button
                onClick={logout}
                className="min-h-[48px] rounded-md border border-gray-700 px-4 text-sm font-medium text-gray-300 hover:bg-gray-800"
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      )}
    </header>
  )
}

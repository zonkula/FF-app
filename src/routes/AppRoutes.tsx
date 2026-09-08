import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { DraftPage } from '../pages/DraftPage'
import { WaiverPage } from '../pages/WaiverPage'
import { MatchupPage } from '../pages/MatchupPage'
import { StandingsPage } from '../pages/StandingsPage'
import { RosterPage } from '../pages/RosterPage'
import { AdminPage } from '../pages/AdminPage'
import { RequireAuth } from '../components/RequireAuth'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/draft" replace />} />
      <Route
        path="/draft"
        element={
          <RequireAuth>
            <DraftPage />
          </RequireAuth>
        }
      />
      <Route
        path="/waiver"
        element={
          <RequireAuth>
            <WaiverPage />
          </RequireAuth>
        }
      />
      <Route
        path="/matchup"
        element={
          <RequireAuth>
            <MatchupPage />
          </RequireAuth>
        }
      />
      <Route
        path="/standings"
        element={
          <RequireAuth>
            <StandingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/roster"
        element={
          <RequireAuth>
            <RosterPage />
          </RequireAuth>
        }
      />
      {/* Admin has its own separate password gate and doesn't need a logged-in player. */}
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/draft" replace />} />
    </Routes>
  )
}

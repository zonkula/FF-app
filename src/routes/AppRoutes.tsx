import { Navigate, Route, Routes } from 'react-router-dom'
import { DraftPage } from '../pages/DraftPage'
import { WaiverPage } from '../pages/WaiverPage'
import { MatchupPage } from '../pages/MatchupPage'
import { StandingsPage } from '../pages/StandingsPage'
import { RosterPage } from '../pages/RosterPage'
import { AdminPage } from '../pages/AdminPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/draft" replace />} />
      <Route path="/draft" element={<DraftPage />} />
      <Route path="/waiver" element={<WaiverPage />} />
      <Route path="/matchup" element={<MatchupPage />} />
      <Route path="/standings" element={<StandingsPage />} />
      <Route path="/roster" element={<RosterPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/draft" replace />} />
    </Routes>
  )
}

import { useState } from 'react'
import type { Player, Position } from '../types/player'
import { useDraft } from '../hooks/useDraft'
import { usePlayers } from '../context/PlayersContext'
import { useWeeklyScores } from '../hooks/useWeeklyScores'
import { useWeeklyProjections } from '../hooks/useWeeklyProjections'
import { useLeagueHistory } from '../hooks/useLeagueHistory'
import type { PlayerHistoryLine, WeekHistoryEntry } from '../utils/firebase'
import type { WeeklyPoints } from '../services/sleeperApi'
import { POSITION_COLORS } from '../utils/positionColors'
import { PLAYER_DISPLAY_NAMES } from '../utils/playerNames'

interface DisplayLine {
  id: string
  name: string
  position: Position
  actual: number | null
  projected: number | null
}

function toDisplayLines(roster: Player[], scores: WeeklyPoints, projections: WeeklyPoints): DisplayLine[] {
  return roster.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    actual: scores[p.id] ?? null,
    projected: projections[p.id] ?? null,
  }))
}

function historyToDisplayLines(lines: PlayerHistoryLine[]): DisplayLine[] {
  return lines.map((line) => ({
    id: line.playerId,
    name: line.name,
    position: line.position,
    actual: line.points,
    projected: null,
  }))
}

type MatchupStatus = 'final' | 'live' | 'draft-in-progress' | 'no-data'

const STATUS_LABEL: Record<MatchupStatus, string> = {
  final: 'Final',
  live: 'Live',
  'draft-in-progress': 'Draft in progress',
  'no-data': 'No data',
}

const STATUS_COLOR: Record<MatchupStatus, string> = {
  final: 'bg-gray-700 text-gray-300',
  live: 'bg-emerald-600 text-white',
  'draft-in-progress': 'bg-amber-600 text-white',
  'no-data': 'bg-gray-800 text-gray-500',
}

export function MatchupPage() {
  const { playerOneRoster, playerTwoRoster, weekNumber, isDraftComplete, isConnected, connectionError } = useDraft()
  const { week: sleeperWeek } = usePlayers()
  const { history } = useLeagueHistory()

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const activeWeek = selectedWeek ?? weekNumber
  const historyEntry = history.find((h) => h.week === activeWeek) ?? null
  const isLiveWeek = !historyEntry && activeWeek === weekNumber

  const { scores: liveScores, totalPoints: liveP1Total } = useWeeklyScores(
    isLiveWeek ? sleeperWeek : null,
    playerOneRoster,
  )
  const { totalPoints: liveP2Total } = useWeeklyScores(isLiveWeek ? sleeperWeek : null, playerTwoRoster)
  const { projections } = useWeeklyProjections(isLiveWeek ? sleeperWeek : null)

  if (connectionError) {
    return (
      <p className="mx-auto max-w-md p-8 text-center text-sm text-red-400">
        Couldn't connect to Firebase: {connectionError}
      </p>
    )
  }

  if (!isConnected) {
    return <p className="p-8 text-center text-sm text-gray-400">Connecting...</p>
  }

  const status: MatchupStatus = historyEntry
    ? 'final'
    : activeWeek === weekNumber
      ? isDraftComplete
        ? 'live'
        : 'draft-in-progress'
      : 'no-data'

  const p1Lines = historyEntry
    ? historyToDisplayLines(historyEntry.player1Roster)
    : toDisplayLines(playerOneRoster, liveScores, projections)
  const p2Lines = historyEntry
    ? historyToDisplayLines(historyEntry.player2Roster)
    : toDisplayLines(playerTwoRoster, liveScores, projections)
  const p1Total = historyEntry ? historyEntry.player1Score : liveP1Total
  const p2Total = historyEntry ? historyEntry.player2Score : liveP2Total
  const showProjected = status === 'live' || status === 'draft-in-progress'

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <WeekNav
        activeWeek={activeWeek}
        maxWeek={weekNumber}
        onChange={(w) => setSelectedWeek(w === weekNumber ? null : w)}
      />

      <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[status]}`}>
            {STATUS_LABEL[status]}
          </span>
          <span className="text-sm text-gray-400">Week {activeWeek} matchup</span>
        </div>
        {status !== 'no-data' && status !== 'draft-in-progress' && (
          <div className="text-lg font-semibold text-gray-100">
            {p1Total.toFixed(1)} <span className="text-sm font-normal text-gray-500">vs</span> {p2Total.toFixed(1)}
          </div>
        )}
      </div>

      {status === 'draft-in-progress' && (
        <p className="rounded-lg border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          This week's draft isn't complete yet - the matchup starts once both rosters are set.
        </p>
      )}

      {status === 'no-data' && (
        <p className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-500">
          No results recorded for week {activeWeek}.
        </p>
      )}

      {historyEntry && <HistoricalResultBanner entry={historyEntry} />}

      {status !== 'no-data' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RosterLinesCard label={PLAYER_DISPLAY_NAMES.player1} lines={p1Lines} total={p1Total} showProjected={showProjected} />
          <RosterLinesCard label={PLAYER_DISPLAY_NAMES.player2} lines={p2Lines} total={p2Total} showProjected={showProjected} />
        </div>
      )}
    </div>
  )
}

function WeekNav({
  activeWeek,
  maxWeek,
  onChange,
}: {
  activeWeek: number
  maxWeek: number
  onChange: (week: number) => void
}) {
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1)
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, activeWeek - 1))}
        disabled={activeWeek <= 1}
        className="rounded-md border border-gray-700 px-2.5 py-1 text-sm text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ←
      </button>
      <select
        value={activeWeek}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-sky-500 focus:outline-none"
      >
        {weeks.map((w) => (
          <option key={w} value={w}>
            Week {w}
          </option>
        ))}
      </select>
      <button
        onClick={() => onChange(Math.min(maxWeek, activeWeek + 1))}
        disabled={activeWeek >= maxWeek}
        className="rounded-md border border-gray-700 px-2.5 py-1 text-sm text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        →
      </button>
    </div>
  )
}

function HistoricalResultBanner({ entry }: { entry: WeekHistoryEntry }) {
  const winnerLabel =
    entry.winner === 'tie'
      ? "It's a tie."
      : `${PLAYER_DISPLAY_NAMES[entry.winner]} won.`
  return (
    <p className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-center text-sm text-gray-300">
      {winnerLabel}
    </p>
  )
}

function RosterLinesCard({
  label,
  lines,
  total,
  showProjected,
}: {
  label: string
  lines: DisplayLine[]
  total: number
  showProjected: boolean
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-gray-100">{label}</h3>
        <span className="text-sm text-gray-300">{total.toFixed(1)} pts</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
            <th className="py-1.5 font-medium">Player</th>
            {showProjected && <th className="py-1.5 text-right font-medium">Proj.</th>}
            <th className="py-1.5 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-gray-800/50 last:border-0">
              <td className="py-1.5">
                <span className="text-gray-200">{line.name}</span>{' '}
                <span className={`rounded px-1.5 py-0.5 text-xs ${POSITION_COLORS[line.position]}`}>
                  {line.position}
                </span>
              </td>
              {showProjected && (
                <td className="py-1.5 text-right text-gray-500">{line.projected != null ? line.projected.toFixed(1) : '—'}</td>
              )}
              <td className="py-1.5 text-right text-gray-300">{line.actual != null ? line.actual.toFixed(1) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

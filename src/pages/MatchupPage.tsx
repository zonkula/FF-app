import { useEffect, useState } from 'react'
import type { Player, Position } from '../types/player'
import { useDraft } from '../hooks/useDraft'
import { usePlayers } from '../context/PlayersContext'
import { useWeeklyScores } from '../hooks/useWeeklyScores'
import { useWeeklyProjections } from '../hooks/useWeeklyProjections'
import { useLeagueHistory } from '../hooks/useLeagueHistory'
import type { PlayerHistoryLine, WeekHistoryEntry } from '../utils/firebase'
import type { WeeklyPoints } from '../services/sleeperApi'
import { formatRelativeTime } from '../utils/relativeTime'
import { PLAYER_DISPLAY_NAMES } from '../utils/playerNames'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { PositionBadge } from '../components/PositionBadge'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { FORM_CONTROL_CLASSES } from '../components/Input'

interface DisplayLine {
  id: string
  name: string
  position: Position
  nflTeam: string
  actual: number | null
  projected: number | null
}

function toDisplayLines(roster: Player[], scores: WeeklyPoints, projections: WeeklyPoints): DisplayLine[] {
  return roster.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    nflTeam: p.nflTeam,
    actual: scores[p.id] ?? null,
    projected: projections[p.id] ?? null,
  }))
}

function historyToDisplayLines(lines: PlayerHistoryLine[]): DisplayLine[] {
  return lines.map((line) => ({
    id: line.playerId,
    name: line.name,
    position: line.position,
    nflTeam: line.nflTeam,
    actual: line.points,
    projected: null,
  }))
}

/** Ticks periodically so a "Last updated: X ago" label keeps counting up without needing a refetch. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

type MatchupStatus = 'final' | 'live' | 'draft-in-progress' | 'no-data'

const STATUS_LABEL: Record<MatchupStatus, string> = {
  final: 'Final',
  live: 'Live',
  'draft-in-progress': 'Draft in progress',
  'no-data': 'No data',
}

const STATUS_COLOR: Record<MatchupStatus, string> = {
  final: 'bg-slate-700 text-slate-300',
  live: 'bg-emerald-500 text-white',
  'draft-in-progress': 'bg-amber-500 text-white',
  'no-data': 'bg-slate-800 text-slate-500',
}

export function MatchupPage() {
  const { playerOneRoster, playerTwoRoster, weekNumber, isDraftComplete, isConnected, connectionError } = useDraft()
  const { week: sleeperWeek } = usePlayers()
  const { history } = useLeagueHistory()

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const activeWeek = selectedWeek ?? weekNumber
  const historyEntry = history.find((h) => h.week === activeWeek) ?? null
  const isLiveWeek = !historyEntry && activeWeek === weekNumber

  // One call gets the raw scores map for the week; both rosters' totals are summed from it below
  // rather than calling the hook twice, so a single "Refresh" click updates both sides at once.
  const {
    scores: liveScores,
    loading: scoresLoading,
    lastUpdated,
    refresh,
  } = useWeeklyScores(isLiveWeek ? sleeperWeek : null)
  const { projections } = useWeeklyProjections(isLiveWeek ? sleeperWeek : null)
  const now = useNow(15000)

  if (connectionError) {
    return (
      <p className="mx-auto max-w-md p-8 text-center text-sm text-red-400">
        Couldn't connect to Firebase: {connectionError}
      </p>
    )
  }

  if (!isConnected) {
    return <p className="p-8 text-center text-sm text-slate-400">Connecting...</p>
  }

  const status: MatchupStatus = historyEntry
    ? 'final'
    : activeWeek === weekNumber
      ? isDraftComplete
        ? 'live'
        : 'draft-in-progress'
      : 'no-data'

  const liveP1Total = playerOneRoster.reduce((sum, p) => sum + (liveScores[p.id] ?? 0), 0)
  const liveP2Total = playerTwoRoster.reduce((sum, p) => sum + (liveScores[p.id] ?? 0), 0)

  const p1Lines = historyEntry
    ? historyToDisplayLines(historyEntry.player1Roster)
    : toDisplayLines(playerOneRoster, liveScores, projections)
  const p2Lines = historyEntry
    ? historyToDisplayLines(historyEntry.player2Roster)
    : toDisplayLines(playerTwoRoster, liveScores, projections)
  const p1Total = historyEntry ? historyEntry.player1Score : liveP1Total
  const p2Total = historyEntry ? historyEntry.player2Score : liveP2Total
  const showProjected = status === 'live' || status === 'draft-in-progress'
  const isLive = status === 'live'

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
      <WeekNav
        activeWeek={activeWeek}
        maxWeek={weekNumber}
        onChange={(w) => setSelectedWeek(w === weekNumber ? null : w)}
      />

      <Card padding="px-4 py-3" hoverGlow={false}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            <span className="text-sm text-slate-400">Week {activeWeek} matchup</span>
          </div>
          {status !== 'no-data' && status !== 'draft-in-progress' && (
            <div
              className={`text-lg font-bold ${isLive ? 'animate-pulse text-emerald-500' : 'text-white'}`}
            >
              {p1Total.toFixed(1)} <span className="text-sm font-normal text-slate-500">vs</span> {p2Total.toFixed(1)}
            </div>
          )}
        </div>
      </Card>

      {status === 'live' && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={refresh} disabled={scoresLoading}>
            {scoresLoading ? 'Refreshing scores...' : 'Refresh Scores'}
          </Button>
          {lastUpdated != null && (
            <span className="text-xs text-slate-500">Last updated: {formatRelativeTime(lastUpdated, now)}</span>
          )}
        </div>
      )}

      {status === 'draft-in-progress' && (
        <p className="rounded-lg border border-amber-500 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          This week's draft isn't complete yet - the matchup starts once both rosters are set.
        </p>
      )}

      {status === 'no-data' && (
        <p className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-500">
          No results recorded for week {activeWeek}.
        </p>
      )}

      {historyEntry && <HistoricalResultBanner entry={historyEntry} />}

      {status !== 'no-data' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RosterLinesCard
            label={PLAYER_DISPLAY_NAMES.player1}
            lines={p1Lines}
            total={p1Total}
            showProjected={showProjected}
            isLive={isLive}
          />
          <RosterLinesCard
            label={PLAYER_DISPLAY_NAMES.player2}
            lines={p2Lines}
            total={p2Total}
            showProjected={showProjected}
            isLive={isLive}
          />
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
        className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-md border-2 border-slate-700 text-sm text-slate-300 transition-colors duration-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ←
      </button>
      <select
        value={activeWeek}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`min-h-[48px] ${FORM_CONTROL_CLASSES}`}
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
        className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-md border-2 border-slate-700 text-sm text-slate-300 transition-colors duration-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        →
      </button>
    </div>
  )
}

function HistoricalResultBanner({ entry }: { entry: WeekHistoryEntry }) {
  const winnerLabel = entry.winner === 'tie' ? "It's a tie." : `${PLAYER_DISPLAY_NAMES[entry.winner]} won.`
  return (
    <p className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-center text-sm text-slate-300">
      {winnerLabel}
    </p>
  )
}

function RosterLinesCard({
  label,
  lines,
  total,
  showProjected,
  isLive,
}: {
  label: string
  lines: DisplayLine[]
  total: number
  showProjected: boolean
  isLive: boolean
}) {
  return (
    <Card padding="p-4" hoverGlow={false}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-white">{label}</h3>
        <span className={`text-sm font-bold ${isLive ? 'animate-pulse text-emerald-500' : 'text-slate-300'}`}>
          {total.toFixed(1)} pts
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
              <th className="py-1.5 font-medium">Player</th>
              {showProjected && <th className="py-1.5 text-right font-medium">Proj.</th>}
              <th className="py-1.5 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-slate-800 last:border-0">
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={line} />
                    <span>
                      <span className="text-slate-200">{line.name}</span>{' '}
                      <PositionBadge position={line.position} />
                    </span>
                  </div>
                </td>
                {showProjected && (
                  <td className="py-1.5 text-right text-slate-500">
                    {line.projected != null ? line.projected.toFixed(1) : '—'}
                  </td>
                )}
                <td
                  className={`py-1.5 text-right ${
                    isLive && line.actual != null ? 'animate-pulse font-bold text-emerald-500' : 'text-slate-300'
                  }`}
                >
                  {line.actual != null ? line.actual.toFixed(1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

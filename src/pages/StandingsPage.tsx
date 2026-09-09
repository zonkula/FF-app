import { useMemo, useState } from 'react'
import { useLeagueHistory } from '../hooks/useLeagueHistory'
import { useSeasonRecord } from '../hooks/useSeasonRecord'
import { PLAYER_DISPLAY_NAMES } from '../utils/playerNames'
import type { WeekHistoryEntry } from '../utils/firebase'
import type { PlayerSlot } from '../context/draftLogic'
import { Card } from '../components/Card'

type SortOrder = 'newest' | 'oldest'

export function StandingsPage() {
  const { history, loading } = useLeagueHistory()
  const seasonRecord = useSeasonRecord()
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const sortedHistory = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.week - b.week)
    return sortOrder === 'newest' ? sorted.reverse() : sorted
  }, [history, sortOrder])

  const { best, worst } = useMemo(() => extremeScores(history), [history])

  if (loading) {
    return <p className="p-8 text-center text-sm text-slate-400">Loading standings...</p>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-3 sm:p-4">
      <Card padding="p-3 sm:p-4" hoverGlow={false}>
        <h2 className="mb-3 font-semibold text-white">Season Record</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                <th className="py-1.5 font-medium">Player</th>
                <th className="py-1.5 text-right font-medium">Wins</th>
                <th className="py-1.5 text-right font-medium">Losses</th>
                <th className="py-1.5 text-right font-medium">Ties</th>
              </tr>
            </thead>
            <tbody>
              {(['player1', 'player2'] as const).map((slot) => (
                <tr key={slot} className="border-b border-slate-800 last:border-0">
                  <td className="py-1.5 text-slate-200">{PLAYER_DISPLAY_NAMES[slot]}</td>
                  <td className="py-1.5 text-right text-slate-300">{seasonRecord[slot].wins}</td>
                  <td className="py-1.5 text-right text-slate-300">{seasonRecord[slot].losses}</td>
                  <td className="py-1.5 text-right text-slate-300">{seasonRecord[slot].ties}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Highest score this season" entry={best} />
        <StatCard title="Lowest score this season" entry={worst} />
      </div>

      <Card padding="p-3 sm:p-4" hoverGlow={false}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-white">Weekly Results</h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSortOrder('newest')}
              className={`min-h-[44px] rounded-full px-4 text-xs font-semibold transition-colors duration-300 ${
                sortOrder === 'newest'
                  ? 'bg-gradient-to-r from-blue-800 to-sky-500 text-white shadow-md'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Newest first
            </button>
            <button
              onClick={() => setSortOrder('oldest')}
              className={`min-h-[44px] rounded-full px-4 text-xs font-semibold transition-colors duration-300 ${
                sortOrder === 'oldest'
                  ? 'bg-gradient-to-r from-blue-800 to-sky-500 text-white shadow-md'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Oldest first
            </button>
          </div>
        </div>

        {sortedHistory.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No completed weeks yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                  <th className="py-1.5 font-medium">Week</th>
                  <th className="py-1.5 text-right font-medium">{PLAYER_DISPLAY_NAMES.player1}</th>
                  <th className="py-1.5 text-right font-medium">{PLAYER_DISPLAY_NAMES.player2}</th>
                  <th className="py-1.5 text-right font-medium">Winner</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((entry) => (
                  <tr key={entry.week} className="border-b border-slate-800 last:border-0">
                    <td className="py-1.5 text-slate-200">Week {entry.week}</td>
                    <td className="py-1.5 text-right text-slate-300">{entry.player1Score.toFixed(1)}</td>
                    <td className="py-1.5 text-right text-slate-300">{entry.player2Score.toFixed(1)}</td>
                    <td className="py-1.5 text-right text-slate-300">
                      {entry.winner === 'tie' ? 'Tie' : PLAYER_DISPLAY_NAMES[entry.winner]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

interface ScoreExtreme {
  week: number
  slot: PlayerSlot
  score: number
}

function extremeScores(history: WeekHistoryEntry[]): { best: ScoreExtreme | null; worst: ScoreExtreme | null } {
  const all: ScoreExtreme[] = history.flatMap((entry) => [
    { week: entry.week, slot: 'player1' as const, score: entry.player1Score },
    { week: entry.week, slot: 'player2' as const, score: entry.player2Score },
  ])
  if (all.length === 0) return { best: null, worst: null }
  const best = all.reduce((max, e) => (e.score > max.score ? e : max), all[0])
  const worst = all.reduce((min, e) => (e.score < min.score ? e : min), all[0])
  return { best, worst }
}

function StatCard({ title, entry }: { title: string; entry: ScoreExtreme | null }) {
  return (
    <Card padding="p-4" hoverGlow={false} className="text-center">
      <p className="text-xs text-slate-500">{title}</p>
      {entry ? (
        <>
          <p className="mt-1 text-2xl font-bold text-white">{entry.score.toFixed(1)}</p>
          <p className="text-xs text-slate-500">
            {PLAYER_DISPLAY_NAMES[entry.slot]} · Week {entry.week}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-600">No data yet</p>
      )}
    </Card>
  )
}

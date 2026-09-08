import { useMemo, useState } from 'react'
import type { Player, Position } from '../types/player'
import { POSITION_COLORS } from '../utils/positionColors'

export interface PlayerPoolProps {
  players: Player[]
  onDraft: (playerId: string) => void
  /** Whether the current roster still has an open slot for a given position. */
  canDraft: (position: Position) => boolean
}

type PositionFilter = Position | 'ALL'
type SortKey = 'adp' | 'pprPoints'

const POSITIONS: PositionFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export function PlayerPool({ players, onDraft, canDraft }: PlayerPoolProps) {
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('adp')

  const visiblePlayers = useMemo(() => {
    const filtered = players.filter((player) => {
      const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
      const matchesSearch = player.name.toLowerCase().includes(search.trim().toLowerCase())
      return matchesPosition && matchesSearch
    })

    return [...filtered].sort((a, b) =>
      sortKey === 'adp' ? a.adp - b.adp : b.pprPoints - a.pprPoints,
    )
  }, [players, search, positionFilter, sortKey])

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="min-h-[48px] rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-gray-100 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="min-h-[48px] rounded-md border border-gray-700 bg-gray-800 px-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none"
          >
            <option value="adp">Sort: ADP</option>
            <option value="pprPoints">Sort: PPR points</option>
          </select>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {POSITIONS.map((position) => (
          <button
            key={position}
            onClick={() => setPositionFilter(position)}
            className={`min-h-[40px] rounded-full px-3 text-xs font-medium transition-colors ${
              positionFilter === position
                ? 'bg-sky-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {position}
          </button>
        ))}
      </div>

      <div className="max-h-96 overflow-y-auto overflow-x-auto">
        {visiblePlayers.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No players match.</p>
        ) : (
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="py-2 font-medium">Player</th>
                <th className="py-2 font-medium">Team</th>
                <th className="py-2 font-medium">ADP</th>
                <th className="py-2 font-medium">Bye</th>
                <th className="py-2 font-medium">PPR pts</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player) => {
                const draftable = canDraft(player.position)
                return (
                  <tr
                    key={player.id}
                    className={`border-b border-gray-800/50 last:border-0 ${draftable ? '' : 'opacity-40'}`}
                  >
                    <td className="py-2">
                      <span className="text-gray-100">{player.name}</span>{' '}
                      <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${POSITION_COLORS[player.position]}`}>
                        {player.position}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400">{player.nflTeam}</td>
                    <td className="py-2 text-gray-400">{player.adp}</td>
                    <td className="py-2 text-gray-400">{player.byeWeek}</td>
                    <td className="py-2 text-gray-400">{player.pprPoints.toFixed(0)}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => onDraft(player.id)}
                        disabled={!draftable}
                        title={draftable ? undefined : 'No open roster slot for this position'}
                        className={`min-h-[44px] rounded-md px-3 text-xs font-medium text-white ${
                          draftable ? 'bg-sky-600 hover:bg-sky-500' : 'cursor-not-allowed bg-gray-700'
                        }`}
                      >
                        Draft
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

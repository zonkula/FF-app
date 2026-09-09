import { useMemo, useState } from 'react'
import type { Player, Position } from '../types/player'
import { PlayerAvatar } from './PlayerAvatar'
import { PositionBadge } from './PositionBadge'
import { Card } from './Card'
import { Input, FORM_CONTROL_CLASSES } from './Input'
import { Button } from './Button'

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
    <Card padding="p-3 sm:p-4" hoverGlow={false}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
        />

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className={`min-h-[48px] ${FORM_CONTROL_CLASSES}`}
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
            className={`min-h-[40px] rounded-full px-3 text-xs font-semibold transition-colors duration-300 ${
              positionFilter === position
                ? 'bg-gradient-to-r from-blue-800 to-sky-500 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {position}
          </button>
        ))}
      </div>

      <div className="max-h-96 overflow-y-auto overflow-x-auto">
        {visiblePlayers.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No players match.</p>
        ) : (
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
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
                    className={`border-b border-slate-800 last:border-0 ${draftable ? '' : 'opacity-40'}`}
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar player={player} />
                        <span>
                          <span className="text-white">{player.name}</span>{' '}
                          <PositionBadge position={player.position} className="ml-1" />
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-slate-400">{player.nflTeam}</td>
                    <td className="py-2 text-slate-400">{player.adp}</td>
                    <td className="py-2 text-slate-400">{player.byeWeek}</td>
                    <td className="py-2 text-slate-400">{player.pprPoints.toFixed(0)}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant={draftable ? 'primary' : 'secondary'}
                        compact
                        onClick={() => onDraft(player.id)}
                        disabled={!draftable}
                        title={draftable ? undefined : 'No open roster slot for this position'}
                      >
                        Draft
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}

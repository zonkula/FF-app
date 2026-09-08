import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Player, Position } from '../types/player'
import { useDraft } from '../hooks/useDraft'
import { usePlayers } from '../context/PlayersContext'
import { useViewer } from '../context/ViewerContext'
import { useWeeklyProjections } from '../hooks/useWeeklyProjections'
import { canDraftPosition } from '../context/rosterRules'
import { POSITION_COLORS } from '../utils/positionColors'
import { displayNameForTurn } from '../utils/playerNames'

type PositionFilter = Position | 'ALL'
const POSITIONS: PositionFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export function WaiverPage() {
  const { week } = usePlayers()
  const {
    availablePlayers,
    playerOneRoster,
    playerTwoRoster,
    isConnected,
    connectionError,
    addWaiverPlayer,
  } = useDraft()
  const { projections } = useWeeklyProjections(week)

  const { viewer: actingAs, setViewer: setActingAs } = useViewer()
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [pendingAdd, setPendingAdd] = useState<Player | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const currentRoster = actingAs === 1 ? playerOneRoster : playerTwoRoster

  const visiblePlayers = useMemo(() => {
    const filtered = availablePlayers.filter((player) => {
      const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
      const matchesSearch = player.name.toLowerCase().includes(search.trim().toLowerCase())
      return matchesPosition && matchesSearch
    })
    return [...filtered].sort((a, b) => (projections[b.id] ?? 0) - (projections[a.id] ?? 0))
  }, [availablePlayers, search, positionFilter, projections])

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

  async function handleAdd(player: Player) {
    setActionError(null)
    if (canDraftPosition(currentRoster, player.position)) {
      const result = await addWaiverPlayer(player.id, actingAs)
      if (result.ok) {
        setToast(`Added ${player.name} to ${displayNameForTurn(actingAs)}'s roster.`)
      } else {
        setActionError(result.reason ?? 'Could not add player.')
      }
      return
    }
    // No open slot - need to pick someone to drop first.
    setPendingAdd(player)
  }

  async function handleConfirmSwap(dropPlayer: Player) {
    if (!pendingAdd) return
    const result = await addWaiverPlayer(pendingAdd.id, actingAs, dropPlayer.id)
    if (result.ok) {
      setToast(`Added ${pendingAdd.name}, dropped ${dropPlayer.name} (${displayNameForTurn(actingAs)}).`)
      setPendingAdd(null)
      setActionError(null)
    } else {
      setActionError(result.reason ?? 'Could not complete that swap.')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Adding as:</span>
          {([1, 2] as const).map((turn) => (
            <button
              key={turn}
              onClick={() => {
                setActingAs(turn)
                setPendingAdd(null)
                setActionError(null)
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                actingAs === turn ? 'bg-sky-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {displayNameForTurn(turn)}
            </button>
          ))}
        </div>
        <Link
          to="/roster"
          className="rounded-md border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800"
        >
          View My Roster
        </Link>
      </div>

      {toast && (
        <div className="rounded-lg border border-emerald-600 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300">
          {toast}
        </div>
      )}

      {actionError && !pendingAdd && (
        <div className="flex items-center justify-between rounded-lg border border-red-500 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-3 text-red-400 hover:text-red-200">
            ✕
          </button>
        </div>
      )}

      {pendingAdd && (
        <DropPicker
          addPlayer={pendingAdd}
          roster={currentRoster}
          error={actionError}
          onCancel={() => {
            setPendingAdd(null)
            setActionError(null)
          }}
          onConfirm={handleConfirmSwap}
        />
      )}

      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
          />
          <span className="text-xs text-gray-500">Sorted by projected points (Week {week ?? '—'})</span>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {POSITIONS.map((position) => (
            <button
              key={position}
              onClick={() => setPositionFilter(position)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                positionFilter === position
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {position}
            </button>
          ))}
        </div>

        <div className="max-h-[32rem] overflow-y-auto">
          {visiblePlayers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No players match.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="py-2 font-medium">Player</th>
                  <th className="py-2 font-medium">Bye</th>
                  <th className="py-2 font-medium">Proj. pts</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {visiblePlayers.map((player) => (
                  <tr key={player.id} className="border-b border-gray-800/50 last:border-0">
                    <td className="py-2">
                      <span className="text-gray-100">{player.name}</span>{' '}
                      <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${POSITION_COLORS[player.position]}`}>
                        {player.position}
                      </span>{' '}
                      <span className="text-xs text-gray-500">{player.nflTeam}</span>
                    </td>
                    <td className="py-2 text-gray-400">{player.byeWeek}</td>
                    <td className="py-2 text-gray-400">{(projections[player.id] ?? 0).toFixed(1)}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleAdd(player)}
                        className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-500"
                      >
                        Add Player
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

interface DropPickerProps {
  addPlayer: Player
  roster: Player[]
  error: string | null
  onCancel: () => void
  onConfirm: (dropPlayer: Player) => void
}

function DropPicker({ addPlayer, roster, error, onCancel, onConfirm }: DropPickerProps) {
  return (
    <div className="rounded-lg border border-amber-600 bg-amber-950/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-amber-300">
          No open slot for <span className="font-semibold">{addPlayer.name}</span> ({addPlayer.position}). Drop
          someone to make room:
        </p>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-200">
          Cancel
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      <ul className="space-y-1">
        {roster.map((player) => {
          const wouldWork = canDraftPosition(
            roster.filter((p) => p.id !== player.id),
            addPlayer.position,
          )
          return (
            <li key={player.id} className="flex items-center justify-between text-sm">
              <span className={wouldWork ? 'text-gray-200' : 'text-gray-500'}>
                {player.name} <span className="text-xs text-gray-500">({player.position})</span>
              </span>
              <button
                onClick={() => onConfirm(player)}
                disabled={!wouldWork}
                title={wouldWork ? undefined : `Dropping ${player.name} wouldn't free a slot for ${addPlayer.position}`}
                className={`rounded-md px-2.5 py-1 text-xs font-medium text-white ${
                  wouldWork ? 'bg-amber-600 hover:bg-amber-500' : 'cursor-not-allowed bg-gray-700'
                }`}
              >
                Drop &amp; Add
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

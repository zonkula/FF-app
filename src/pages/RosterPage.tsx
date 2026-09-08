import { useMemo, useState } from 'react'
import type { Player } from '../types/player'
import { useDraft } from '../hooks/useDraft'
import { usePlayers } from '../context/PlayersContext'
import { useAuth } from '../hooks/useAuth'
import { useWeeklyProjections } from '../hooks/useWeeklyProjections'
import { organizeRosterByPosition, type OrganizedRoster } from '../context/rosterRules'
import { POSITION_COLORS } from '../utils/positionColors'
import { displayNameForTurn, turnForPlayerName } from '../utils/playerNames'
import type { Turn } from '../context/DraftContext'
import type { WeeklyPoints } from '../services/sleeperApi'

const SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'] as const

function slotEntries(organized: OrganizedRoster, slot: (typeof SLOT_ORDER)[number]): Player[] {
  const value = organized[slot]
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

function otherTurn(turn: Turn): Turn {
  return turn === 1 ? 2 : 1
}

export function RosterPage() {
  const { week } = usePlayers()
  const { playerOneRoster, playerTwoRoster, availablePlayers, isConnected, connectionError, addWaiverPlayer } =
    useDraft()
  const { user } = useAuth()
  const viewer = turnForPlayerName(user!)
  const { projections } = useWeeklyProjections(week)

  const [viewingOpponent, setViewingOpponent] = useState(false)
  const [swapOutPlayer, setSwapOutPlayer] = useState<Player | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const shownTurn: Turn = viewingOpponent ? otherTurn(viewer) : viewer
  const shownRoster = shownTurn === 1 ? playerOneRoster : playerTwoRoster
  const isMine = !viewingOpponent

  const organized = useMemo(() => organizeRosterByPosition(shownRoster), [shownRoster])
  const totalProjected = shownRoster.reduce((sum, p) => sum + (projections[p.id] ?? 0), 0)

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

  async function handleSwapConfirm(newPlayer: Player) {
    if (!swapOutPlayer) return
    const result = await addWaiverPlayer(newPlayer.id, viewer, swapOutPlayer.id)
    if (result.ok) {
      setSwapOutPlayer(null)
      setActionError(null)
    } else {
      setActionError(result.reason ?? 'Could not complete that swap.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-gray-400">
          Logged in as <span className="font-semibold text-gray-200">{user}</span>
        </span>
        <button
          onClick={() => {
            setViewingOpponent((v) => !v)
            setSwapOutPlayer(null)
            setActionError(null)
          }}
          className="rounded-md border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800"
        >
          {viewingOpponent ? 'View My Roster' : 'View Opponent Roster'}
        </button>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-100">{displayNameForTurn(shownTurn)}'s Roster</h2>
          <span className="text-sm text-gray-400">
            Total projected: <span className="font-semibold text-gray-100">{totalProjected.toFixed(1)}</span> pts
          </span>
        </div>

        {actionError && !swapOutPlayer && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-red-500 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="ml-3 text-red-400 hover:text-red-200">
              ✕
            </button>
          </div>
        )}

        <div className="space-y-2">
          {SLOT_ORDER.map((slot) => {
            const entries = slotEntries(organized, slot)
            return (
              <div key={slot} className="flex items-start gap-3 text-sm">
                <span className="w-12 shrink-0 pt-1 text-xs font-semibold text-gray-500">{slot}</span>
                {entries.length === 0 ? (
                  <span className="pt-1 text-gray-600">—</span>
                ) : (
                  <div className="flex-1 space-y-1">
                    {entries.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-800/50"
                      >
                        <span className="text-gray-200">
                          {player.name}{' '}
                          <span className={`rounded px-1.5 py-0.5 text-xs ${POSITION_COLORS[player.position]}`}>
                            {player.position}
                          </span>{' '}
                          <span className="text-xs text-gray-500">
                            {player.nflTeam} · Bye {player.byeWeek}
                          </span>
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            {(projections[player.id] ?? 0).toFixed(1)} pts
                          </span>
                          {isMine && slot === 'FLEX' && (
                            <button
                              onClick={() => {
                                setSwapOutPlayer(player)
                                setActionError(null)
                              }}
                              className="rounded-md border border-sky-700 px-2 py-0.5 text-xs font-medium text-sky-400 hover:bg-sky-950"
                            >
                              Swap
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {swapOutPlayer && (
        <FlexSwapPicker
          outgoing={swapOutPlayer}
          candidates={availablePlayers.filter((p) => p.position === 'RB' || p.position === 'WR' || p.position === 'TE')}
          projections={projections}
          error={actionError}
          onCancel={() => {
            setSwapOutPlayer(null)
            setActionError(null)
          }}
          onConfirm={handleSwapConfirm}
        />
      )}
    </div>
  )
}

interface FlexSwapPickerProps {
  outgoing: Player
  candidates: Player[]
  projections: WeeklyPoints
  error: string | null
  onCancel: () => void
  onConfirm: (newPlayer: Player) => void
}

function FlexSwapPicker({ outgoing, candidates, projections, error, onCancel, onConfirm }: FlexSwapPickerProps) {
  const [search, setSearch] = useState('')

  const sorted = useMemo(() => {
    const filtered = candidates.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    return [...filtered].sort((a, b) => (projections[b.id] ?? 0) - (projections[a.id] ?? 0)).slice(0, 25)
  }, [candidates, search, projections])

  return (
    <div className="rounded-lg border border-sky-700 bg-sky-950/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-sky-300">
          Swap FLEX: <span className="font-semibold">{outgoing.name}</span> out. Pick a replacement (RB/WR/TE):
        </p>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-200">
          Cancel
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search players..."
        className="mb-3 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
      />

      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <li className="py-4 text-center text-sm text-gray-500">No players match.</li>
        ) : (
          sorted.map((player) => (
            <li key={player.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-200">
                {player.name}{' '}
                <span className={`rounded px-1.5 py-0.5 text-xs ${POSITION_COLORS[player.position]}`}>
                  {player.position}
                </span>{' '}
                <span className="text-xs text-gray-500">{(projections[player.id] ?? 0).toFixed(1)} pts</span>
              </span>
              <button
                onClick={() => onConfirm(player)}
                className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-500"
              >
                Swap In
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

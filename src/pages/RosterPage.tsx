import type { Player } from '../types/player'
import { useDraft } from '../hooks/useDraft'
import { organizeRosterByPosition, type OrganizedRoster } from '../context/rosterRules'
import { POSITION_COLORS } from '../utils/positionColors'

const SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'] as const

function slotEntries(organized: OrganizedRoster, slot: (typeof SLOT_ORDER)[number]): Player[] {
  const value = organized[slot]
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

export function RosterPage() {
  const { playerOneRoster, playerTwoRoster, isConnected, connectionError } = useDraft()

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

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <h2 className="text-lg font-semibold text-gray-100">My Roster</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RosterCard label="Player 1" roster={playerOneRoster} />
        <RosterCard label="Player 2" roster={playerTwoRoster} />
      </div>
    </div>
  )
}

function RosterCard({ label, roster }: { label: string; roster: Player[] }) {
  const organized = organizeRosterByPosition(roster)

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h3 className="mb-3 font-semibold text-gray-100">{label}</h3>
      <div className="space-y-2">
        {SLOT_ORDER.map((slot) => {
          const entries = slotEntries(organized, slot)

          return (
            <div key={slot} className="flex items-start gap-3 text-sm">
              <span className="w-12 shrink-0 text-xs font-semibold text-gray-500">{slot}</span>
              {entries.length === 0 ? (
                <span className="text-gray-600">—</span>
              ) : (
                <div className="flex-1 space-y-1">
                  {entries.map((player) => (
                    <div key={player.id} className="flex items-center justify-between">
                      <span className="text-gray-200">{player.name}</span>
                      <span className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`rounded px-1.5 py-0.5 ${POSITION_COLORS[player.position]}`}>
                          {player.position}
                        </span>
                        {player.nflTeam} · Bye {player.byeWeek}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

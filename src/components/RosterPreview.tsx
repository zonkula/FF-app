import type { Player } from '../types/player'
import { FLEX_SLOTS, getSlotUsage, ROSTER_REQUIREMENTS, ROSTER_SIZE } from '../context/rosterRules'
import { PlayerAvatar } from './PlayerAvatar'

export interface RosterPreviewProps {
  label: string
  roster: Player[]
  isActive: boolean
  /** Optional small badge next to the label, e.g. "Leading" once the draft is complete. */
  badge?: string
}

export function RosterPreview({ label, roster, isActive, badge }: RosterPreviewProps) {
  const { slotsUsed, flexUsed } = getSlotUsage(roster)
  const slots = [
    { label: 'QB', used: slotsUsed.QB, total: ROSTER_REQUIREMENTS.QB },
    { label: 'RB', used: slotsUsed.RB, total: ROSTER_REQUIREMENTS.RB },
    { label: 'WR', used: slotsUsed.WR, total: ROSTER_REQUIREMENTS.WR },
    { label: 'TE', used: slotsUsed.TE, total: ROSTER_REQUIREMENTS.TE },
    { label: 'FLEX', used: flexUsed, total: FLEX_SLOTS },
    { label: 'K', used: slotsUsed.K, total: ROSTER_REQUIREMENTS.K },
    { label: 'DEF', used: slotsUsed.DEF, total: ROSTER_REQUIREMENTS.DEF },
  ]

  return (
    <div
      className={`rounded-lg border p-4 ${
        isActive ? 'border-sky-500 bg-sky-950/30' : 'border-gray-700 bg-gray-900'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-gray-100">
          {label}
          {badge && (
            <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-normal text-emerald-400">
              {badge}
            </span>
          )}
        </h2>
        <span className="text-xs text-gray-400">
          {roster.length}/{ROSTER_SIZE} drafted
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {slots.map((slot) => (
          <span
            key={slot.label}
            className={`rounded px-1.5 py-0.5 text-[11px] ${
              slot.used >= slot.total ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-gray-300'
            }`}
          >
            {slot.label} {slot.used}/{slot.total}
          </span>
        ))}
      </div>

      {roster.length === 0 ? (
        <p className="text-sm text-gray-500">No picks yet.</p>
      ) : (
        <ul className="space-y-1">
          {roster.map((player) => (
            <li key={player.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <PlayerAvatar player={player} />
                <span className="text-gray-200">{player.name}</span>
              </span>
              <span className="text-gray-500">
                {player.position} · {player.nflTeam}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

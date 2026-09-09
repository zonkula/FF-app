import type { Player } from '../types/player'
import { FLEX_SLOTS, getSlotUsage, ROSTER_REQUIREMENTS, ROSTER_SIZE } from '../context/rosterRules'
import { PlayerAvatar } from './PlayerAvatar'
import { Card } from './Card'

export interface RosterPreviewProps {
  label: string
  roster: Player[]
  isActive: boolean
  /** Optional small badge next to the label, e.g. "Leading" once the draft is complete. */
  badge?: string
  /** Player id to briefly bounce, e.g. right after a pick is confirmed. */
  justAddedId?: string | null
}

export function RosterPreview({ label, roster, isActive, badge, justAddedId }: RosterPreviewProps) {
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
    <Card padding="p-4" active={isActive}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-white">
          {label}
          {badge && (
            <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
              {badge}
            </span>
          )}
        </h2>
        <span className="text-xs text-slate-400">
          {roster.length}/{ROSTER_SIZE} drafted
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {slots.map((slot) => (
          <span
            key={slot.label}
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
              slot.used >= slot.total ? 'bg-slate-900 text-slate-500' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {slot.label} {slot.used}/{slot.total}
          </span>
        ))}
      </div>

      {roster.length === 0 ? (
        <p className="text-sm text-slate-500">No picks yet.</p>
      ) : (
        <ul className="space-y-1">
          {roster.map((player) => (
            <li
              key={player.id}
              className={`flex items-center justify-between rounded text-sm ${
                player.id === justAddedId ? 'animate-bounce-once' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <PlayerAvatar player={player} />
                <span className="text-slate-200">{player.name}</span>
              </span>
              <span className="text-slate-500">
                {player.position} · {player.nflTeam}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

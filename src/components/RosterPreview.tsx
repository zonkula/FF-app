import type { Player } from '../types/player'
import { ROSTER_SIZE } from '../context/DraftContext'

export interface RosterPreviewProps {
  label: string
  roster: Player[]
  isActive: boolean
  /** Optional small badge next to the label, e.g. "Leading" once the draft is complete. */
  badge?: string
}

export function RosterPreview({ label, roster, isActive, badge }: RosterPreviewProps) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        isActive ? 'border-sky-500 bg-sky-950/30' : 'border-gray-700 bg-gray-900'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
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

      {roster.length === 0 ? (
        <p className="text-sm text-gray-500">No picks yet.</p>
      ) : (
        <ul className="space-y-1">
          {roster.map((player) => (
            <li key={player.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-200">{player.name}</span>
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

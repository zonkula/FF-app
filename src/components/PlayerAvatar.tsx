import { useState } from 'react'
import type { Player } from '../types/player'

/** What an avatar needs to render - a subset of Player so view-model objects (e.g. saved history lines) can use it too, not just live Player records. */
type AvatarPlayer = Pick<Player, 'name' | 'position' | 'nflTeam' | 'espnId'>

/** Solid fill for the initials fallback - same hue per position as POSITION_COLORS' badges, at full opacity so white initials stay legible. */
const POSITION_FALLBACK_BG: Record<Player['position'], string> = {
  QB: 'bg-red-500',
  RB: 'bg-green-500',
  WR: 'bg-blue-500',
  TE: 'bg-orange-500',
  K: 'bg-purple-500',
  DEF: 'bg-gray-500',
}

const SIZE_CLASSES = {
  sm: 'h-10 w-10 text-xs',
  lg: 'h-16 w-16 text-lg',
} as const

export interface PlayerAvatarProps {
  player: AvatarPlayer
  /** sm = 40px, for list rows. lg = 64px, for roster detail views. */
  size?: keyof typeof SIZE_CLASSES
}

function initialsFor(player: AvatarPlayer): string {
  if (player.position === 'DEF') return player.nflTeam.slice(0, 2).toUpperCase()
  const parts = player.name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** ESPN headshot with an initials-in-position-color fallback for missing/broken images. */
export function PlayerAvatar({ player, size = 'sm' }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false)
  const showPhoto = Boolean(player.espnId) && !failed

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#0EA5E9] shadow-md shadow-blue-500/20 ${SIZE_CLASSES[size]}`}
    >
      {showPhoto ? (
        <img
          src={`https://a.espncdn.com/i/headshots/nfl/players/full/${player.espnId}.png`}
          alt={player.name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-bold text-white ${POSITION_FALLBACK_BG[player.position]}`}
        >
          {initialsFor(player)}
        </div>
      )}
    </div>
  )
}

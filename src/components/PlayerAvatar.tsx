import { useState } from 'react'
import type { Player } from '../types/player'
import { POSITION_BADGE_BG } from '../utils/positionColors'

/** What an avatar needs to render - a subset of Player so view-model objects (e.g. saved history lines) can use it too, not just live Player records. */
type AvatarPlayer = Pick<Player, 'name' | 'position' | 'nflTeam' | 'espnId'>

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
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-sky-500 shadow-md shadow-blue-500/20 ${SIZE_CLASSES[size]}`}
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
          className={`flex h-full w-full items-center justify-center font-bold text-white ${POSITION_BADGE_BG[player.position]}`}
        >
          {initialsFor(player)}
        </div>
      )}
    </div>
  )
}

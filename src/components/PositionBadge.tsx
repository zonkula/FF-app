import type { Position } from '../types/player'
import { POSITION_BADGE_BG } from '../utils/positionColors'

export interface PositionBadgeProps {
  position: Position
  className?: string
}

/** DraftKings-style pill badge: bold saturated fill, white text, fully rounded. */
export function PositionBadge({ position, className = '' }: PositionBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${POSITION_BADGE_BG[position]} ${className}`}
    >
      {position}
    </span>
  )
}

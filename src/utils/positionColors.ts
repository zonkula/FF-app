import type { Position } from '../types/player'

/** Bold, saturated per-position fill - shared by PositionBadge (pill) and PlayerAvatar (initials fallback circle). */
export const POSITION_BADGE_BG: Record<Position, string> = {
  QB: 'bg-blue-500',
  RB: 'bg-emerald-500',
  WR: 'bg-amber-500',
  TE: 'bg-violet-500',
  K: 'bg-indigo-500',
  DEF: 'bg-red-500',
}

/** Same palette, extended with FLEX - a roster slot, not a Player position - for roster slot-usage pills. */
export const SLOT_BADGE_BG: Record<Position | 'FLEX', string> = {
  ...POSITION_BADGE_BG,
  FLEX: 'bg-pink-500',
}

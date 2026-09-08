import type { Position } from '../types/player'

export const POSITION_COLORS: Record<Position, string> = {
  QB: 'bg-red-500/20 text-red-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-blue-500/20 text-blue-300',
  TE: 'bg-orange-500/20 text-orange-300',
  K: 'bg-purple-500/20 text-purple-300',
  DEF: 'bg-gray-500/20 text-gray-300',
}

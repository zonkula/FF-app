import type { Player, Position } from '../types/player'

/** Dedicated slots every roster must fill, before FLEX. */
export const ROSTER_REQUIREMENTS: Record<Position, number> = {
  QB: 1,
  RB: 3,
  WR: 3,
  TE: 2,
  K: 1,
  DEF: 1,
}

/** FLEX slots can be filled by any RB, WR or TE once that position's own slots are full. */
export const FLEX_SLOTS = 2
const FLEX_ELIGIBLE_POSITIONS: Position[] = ['RB', 'WR', 'TE']

export const ROSTER_SIZE =
  Object.values(ROSTER_REQUIREMENTS).reduce((sum, count) => sum + count, 0) + FLEX_SLOTS

export function isFlexEligible(position: Position): boolean {
  return FLEX_ELIGIBLE_POSITIONS.includes(position)
}

export interface SlotUsage {
  slotsUsed: Record<Position, number>
  flexUsed: number
}

/**
 * Recomputes slot usage from a roster in draft order: each player fills their own position's
 * slot while one is open, and only spills into FLEX once it isn't. Assumes every player in
 * `roster` was added under `canDraftPosition`'s guard, so nothing here ever overflows capacity.
 */
export function getSlotUsage(roster: Player[]): SlotUsage {
  const slotsUsed: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 }
  let flexUsed = 0

  for (const player of roster) {
    if (slotsUsed[player.position] < ROSTER_REQUIREMENTS[player.position]) {
      slotsUsed[player.position] += 1
    } else if (isFlexEligible(player.position) && flexUsed < FLEX_SLOTS) {
      flexUsed += 1
    }
  }

  return { slotsUsed, flexUsed }
}

/** Whether `roster` still has an open dedicated or FLEX slot for `position`. */
export function canDraftPosition(roster: Player[], position: Position): boolean {
  const { slotsUsed, flexUsed } = getSlotUsage(roster)
  if (slotsUsed[position] < ROSTER_REQUIREMENTS[position]) return true
  return isFlexEligible(position) && flexUsed < FLEX_SLOTS
}

export function describeNoSlotError(position: Position): string {
  return isFlexEligible(position)
    ? `No open ${position} or FLEX slot left on that roster.`
    : `No open ${position} slot left on that roster.`
}

/** A completed roster grouped by lineup slot, matching how it's stored under `rosters/week-N/`. */
export interface OrganizedRoster {
  QB: Player | null
  RB: Player[]
  WR: Player[]
  TE: Player[]
  FLEX: Player[]
  K: Player | null
  DEF: Player | null
}

/** Groups a flat, ordered pick list into lineup slots using the same greedy fill as getSlotUsage. */
export function organizeRosterByPosition(roster: Player[]): OrganizedRoster {
  const result: OrganizedRoster = { QB: null, RB: [], WR: [], TE: [], FLEX: [], K: null, DEF: null }
  const slotsUsed: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 }

  for (const player of roster) {
    const position = player.position
    if (slotsUsed[position] < ROSTER_REQUIREMENTS[position]) {
      slotsUsed[position] += 1
      if (position === 'QB') result.QB = player
      else if (position === 'K') result.K = player
      else if (position === 'DEF') result.DEF = player
      else result[position].push(player)
    } else if (isFlexEligible(position) && result.FLEX.length < FLEX_SLOTS) {
      result.FLEX.push(player)
    }
  }

  return result
}

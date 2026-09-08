import { describe, expect, it } from 'vitest'
import type { Player, Position } from '../types/player'
import {
  canDraftPosition,
  describeNoSlotError,
  FLEX_SLOTS,
  getSlotUsage,
  organizeRosterByPosition,
  ROSTER_REQUIREMENTS,
  ROSTER_SIZE,
} from './rosterRules'

function player(position: Position, n: number): Player {
  return {
    id: `${position}-${n}`,
    name: `${position} ${n}`,
    position,
    nflTeam: 'AAA',
    adp: n,
    byeWeek: 1,
    pprPoints: 100,
    espnId: null,
  }
}

describe('roster size', () => {
  it('is 1 QB + 3 RB + 3 WR + 2 TE + 2 FLEX + 1 K + 1 DEF = 13', () => {
    expect(ROSTER_REQUIREMENTS).toEqual({ QB: 1, RB: 3, WR: 3, TE: 2, K: 1, DEF: 1 })
    expect(FLEX_SLOTS).toBe(2)
    expect(ROSTER_SIZE).toBe(13)
  })
})

describe('getSlotUsage', () => {
  it('fills dedicated slots first, then spills into FLEX', () => {
    const roster = [player('RB', 1), player('RB', 2), player('RB', 3), player('RB', 4)]
    const { slotsUsed, flexUsed } = getSlotUsage(roster)
    expect(slotsUsed.RB).toBe(3)
    expect(flexUsed).toBe(1)
  })

  it('never spills a non-FLEX-eligible position over', () => {
    const roster = [player('K', 1), player('K', 2)]
    const { slotsUsed, flexUsed } = getSlotUsage(roster)
    expect(slotsUsed.K).toBe(1)
    expect(flexUsed).toBe(0)
  })
})

describe('canDraftPosition', () => {
  it('allows a position while its dedicated slot is open', () => {
    expect(canDraftPosition([], 'WR')).toBe(true)
  })

  it('allows a FLEX-eligible position to use FLEX once its dedicated slots are full', () => {
    const roster = [player('TE', 1), player('TE', 2)]
    expect(canDraftPosition(roster, 'TE')).toBe(true)
  })

  it('rejects a FLEX-eligible position once both its dedicated slots and FLEX are full', () => {
    const roster = [player('WR', 1), player('WR', 2), player('WR', 3), player('WR', 4), player('WR', 5)]
    expect(canDraftPosition(roster, 'WR')).toBe(false)
  })

  it('rejects a non-FLEX-eligible position once its single dedicated slot is full', () => {
    expect(canDraftPosition([player('QB', 1)], 'QB')).toBe(false)
  })
})

describe('organizeRosterByPosition', () => {
  it('places each dedicated position in its own slot', () => {
    const roster = [
      player('QB', 1),
      player('RB', 1),
      player('RB', 2),
      player('RB', 3),
      player('WR', 1),
      player('WR', 2),
      player('WR', 3),
      player('TE', 1),
      player('TE', 2),
      player('K', 1),
      player('DEF', 1),
    ]
    const organized = organizeRosterByPosition(roster)
    expect(organized.QB?.id).toBe('QB-1')
    expect(organized.RB.map((p) => p.id)).toEqual(['RB-1', 'RB-2', 'RB-3'])
    expect(organized.WR.map((p) => p.id)).toEqual(['WR-1', 'WR-2', 'WR-3'])
    expect(organized.TE.map((p) => p.id)).toEqual(['TE-1', 'TE-2'])
    expect(organized.K?.id).toBe('K-1')
    expect(organized.DEF?.id).toBe('DEF-1')
    expect(organized.FLEX).toEqual([])
  })

  it('spills extra RB/WR/TE picks into FLEX once their dedicated slots are full', () => {
    const roster = [
      player('RB', 1),
      player('RB', 2),
      player('RB', 3),
      player('RB', 4), // -> FLEX
      player('WR', 1),
      player('WR', 2),
      player('WR', 3),
      player('WR', 4), // -> FLEX
    ]
    const organized = organizeRosterByPosition(roster)
    expect(organized.RB.map((p) => p.id)).toEqual(['RB-1', 'RB-2', 'RB-3'])
    expect(organized.WR.map((p) => p.id)).toEqual(['WR-1', 'WR-2', 'WR-3'])
    expect(organized.FLEX.map((p) => p.id)).toEqual(['RB-4', 'WR-4'])
  })
})

describe('describeNoSlotError', () => {
  it('mentions FLEX for FLEX-eligible positions', () => {
    expect(describeNoSlotError('RB')).toMatch(/FLEX/)
  })

  it('does not mention FLEX for non-FLEX-eligible positions', () => {
    expect(describeNoSlotError('QB')).not.toMatch(/FLEX/)
  })
})

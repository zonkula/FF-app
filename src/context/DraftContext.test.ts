import { describe, expect, it } from 'vitest'
import type { Player } from '../types/player'
import { createInitialDraftState, draftReducer, isDraftComplete, ROSTER_SIZE } from './DraftContext'

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    position: 'RB',
    nflTeam: 'AAA',
    adp: i + 1,
    byeWeek: 1,
    pprPoints: 100 - i,
  }))
}

describe('draftReducer - turn alternation', () => {
  it('alternates currentTurn and assigns picks to the correct roster', () => {
    let state = createInitialDraftState(makePlayers(6))

    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' })
    expect(state.currentTurn).toBe(2)
    expect(state.playerOneRoster.map((p) => p.id)).toEqual(['p1'])

    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p2' })
    expect(state.currentTurn).toBe(1)
    expect(state.playerTwoRoster.map((p) => p.id)).toEqual(['p2'])

    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p3' })
    expect(state.currentTurn).toBe(2)
    expect(state.playerOneRoster.map((p) => p.id)).toEqual(['p1', 'p3'])
  })

  it('removes drafted players from the available pool', () => {
    let state = createInitialDraftState(makePlayers(6))
    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' })
    expect(state.availablePlayers.map((p) => p.id)).not.toContain('p1')
    expect(state.availablePlayers).toHaveLength(5)
  })
})

describe('draftReducer - picks are locked in', () => {
  it('rejects drafting the same player twice and leaves rosters unchanged', () => {
    let state = createInitialDraftState(makePlayers(6))
    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' })
    const before = state

    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' })
    expect(after.error).toBe('Player already drafted.')
    expect(after.playerOneRoster).toEqual(before.playerOneRoster)
    expect(after.playerTwoRoster).toEqual(before.playerTwoRoster)
    expect(after.currentTurn).toBe(before.currentTurn)
  })

  it('rejects an unknown player id', () => {
    const state = createInitialDraftState(makePlayers(6))
    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'not-a-real-id' })
    expect(after.error).toBe('Unknown player.')
    expect(after.currentTurn).toBe(1)
  })
})

describe('draftReducer - out-of-turn picks', () => {
  it('rejects a pick made as the wrong player and leaves the turn unchanged', () => {
    const state = createInitialDraftState(makePlayers(6))
    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1', asPlayer: 2 })
    expect(after.error).toMatch(/turn/i)
    expect(after.currentTurn).toBe(1)
    expect(after.playerOneRoster).toHaveLength(0)
    expect(after.playerTwoRoster).toHaveLength(0)
  })

  it('accepts a pick made as the correct player', () => {
    const state = createInitialDraftState(makePlayers(6))
    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1', asPlayer: 1 })
    expect(after.error).toBeNull()
    expect(after.playerOneRoster.map((p) => p.id)).toEqual(['p1'])
  })
})

describe('draftReducer - draft completion', () => {
  it('marks the draft complete once both rosters reach ROSTER_SIZE and blocks further picks', () => {
    let state = createInitialDraftState(makePlayers(ROSTER_SIZE * 2 + 2))
    for (let i = 0; i < ROSTER_SIZE * 2; i++) {
      state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: `p${i + 1}` })
    }
    expect(state.playerOneRoster).toHaveLength(ROSTER_SIZE)
    expect(state.playerTwoRoster).toHaveLength(ROSTER_SIZE)
    expect(isDraftComplete(state)).toBe(true)

    const remainingId = `p${ROSTER_SIZE * 2 + 1}`
    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: remainingId })
    expect(after.error).toMatch(/complete/i)
    expect(after.playerOneRoster).toHaveLength(ROSTER_SIZE)
    expect(after.playerTwoRoster).toHaveLength(ROSTER_SIZE)
  })
})

describe('draftReducer - weekly reset', () => {
  it('clears rosters, restores the full player pool, and resets currentTurn to 1', () => {
    let state = createInitialDraftState(makePlayers(6))
    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' })

    const freshPlayers = makePlayers(6)
    state = draftReducer(state, {
      type: 'RESET_WEEK',
      players: freshPlayers,
      weekId: '2026-09-15',
      weeksElapsed: 1,
    })

    expect(state.availablePlayers).toEqual(freshPlayers)
    expect(state.playerOneRoster).toHaveLength(0)
    expect(state.playerTwoRoster).toHaveLength(0)
    expect(state.currentTurn).toBe(1)
    expect(state.weekId).toBe('2026-09-15')
    expect(state.weekNumber).toBe(2)
  })
})

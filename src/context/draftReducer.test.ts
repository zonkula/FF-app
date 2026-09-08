import { describe, expect, it } from 'vitest'
import type { Player, Position } from '../types/player'
import { createInitialDraftState, draftReducer, isDraftComplete } from './draftReducer'
import { ROSTER_SIZE } from './rosterRules'

function makePlayer(n: number, position: Position = 'RB'): Player {
  return {
    id: `p${n}`,
    name: `Player ${n}`,
    position,
    nflTeam: 'AAA',
    adp: n,
    byeWeek: 1,
    pprPoints: 100 - n,
  }
}

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => makePlayer(i + 1))
}

function initialState(players: Player[]) {
  return createInitialDraftState(players, 'test-week-1', 1)
}

describe('draftReducer - turn alternation', () => {
  it('alternates currentTurn and assigns picks to the correct roster', () => {
    let state = initialState(makePlayers(6))

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
    let state = initialState(makePlayers(6))
    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' })
    expect(state.availablePlayers.map((p) => p.id)).not.toContain('p1')
    expect(state.availablePlayers).toHaveLength(5)
  })
})

describe('draftReducer - picks are locked in', () => {
  it('rejects drafting the same player twice and leaves rosters unchanged', () => {
    let state = initialState(makePlayers(6))
    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' })
    const before = state

    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' })
    expect(after.error).toBe('Player already drafted.')
    expect(after.playerOneRoster).toEqual(before.playerOneRoster)
    expect(after.playerTwoRoster).toEqual(before.playerTwoRoster)
    expect(after.currentTurn).toBe(before.currentTurn)
  })

  it('rejects an unknown player id', () => {
    const state = initialState(makePlayers(6))
    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'not-a-real-id' })
    expect(after.error).toBe('Unknown player.')
    expect(after.currentTurn).toBe(1)
  })
})

describe('draftReducer - out-of-turn picks', () => {
  it('rejects a pick made as the wrong player and leaves the turn unchanged', () => {
    const state = initialState(makePlayers(6))
    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1', asPlayer: 2 })
    expect(after.error).toMatch(/turn/i)
    expect(after.currentTurn).toBe(1)
    expect(after.playerOneRoster).toHaveLength(0)
    expect(after.playerTwoRoster).toHaveLength(0)
  })

  it('accepts a pick made as the correct player', () => {
    const state = initialState(makePlayers(6))
    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1', asPlayer: 1 })
    expect(after.error).toBeNull()
    expect(after.playerOneRoster.map((p) => p.id)).toEqual(['p1'])
  })
})

describe('draftReducer - position slot limits', () => {
  it('rejects a second QB since QB has no FLEX eligibility', () => {
    const players = [makePlayer(1, 'QB'), makePlayer(2, 'QB'), makePlayer(3, 'QB')]
    let state = initialState(players)
    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' }) // Player 1's QB slot
    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p2' }) // Player 2's QB slot

    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p3' }) // Player 1's 2nd QB
    expect(after.error).toBe('No open QB slot left on that roster.')
    expect(after.playerOneRoster).toHaveLength(1)
  })

  it('fills RB via FLEX once dedicated RB slots are full, then rejects once FLEX is also full', () => {
    // Player 1 drafts 5 RBs (3 dedicated + 2 FLEX); Player 2 drafts one filler at each turn
    // so alternation lines up with Player 1's RB picks.
    const players = [
      makePlayer(1, 'RB'),
      makePlayer(2, 'DEF'),
      makePlayer(3, 'RB'),
      makePlayer(4, 'K'),
      makePlayer(5, 'RB'),
      makePlayer(6, 'TE'),
      makePlayer(7, 'RB'),
      makePlayer(8, 'WR'),
      makePlayer(9, 'RB'),
      makePlayer(10, 'QB'),
      makePlayer(11, 'RB'),
    ]
    let state = initialState(players)
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']) {
      state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: id })
      expect(state.error).toBeNull()
    }
    expect(state.playerOneRoster.filter((p) => p.position === 'RB')).toHaveLength(5)

    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p11' })
    expect(after.error).toBe('No open RB or FLEX slot left on that roster.')
    expect(after.playerOneRoster.filter((p) => p.position === 'RB')).toHaveLength(5)
  })
})

describe('draftReducer - draft completion', () => {
  const SLOT_PATTERN: Position[] = ['QB', 'RB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'TE', 'RB', 'WR', 'K', 'DEF']

  function makeFullDraftPlayers(): Player[] {
    const players: Player[] = []
    let n = 1
    for (const position of SLOT_PATTERN) {
      players.push(makePlayer(n++, position)) // goes to Player 1
      players.push(makePlayer(n++, position)) // goes to Player 2
    }
    return players
  }

  it('marks the draft complete once both rosters fill every required slot, and blocks further picks', () => {
    const players = makeFullDraftPlayers()
    let state = initialState(players)

    for (const p of players) {
      state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: p.id })
      expect(state.error).toBeNull()
    }

    expect(state.playerOneRoster).toHaveLength(ROSTER_SIZE)
    expect(state.playerTwoRoster).toHaveLength(ROSTER_SIZE)
    expect(isDraftComplete(state)).toBe(true)

    const after = draftReducer(state, { type: 'SELECT_PLAYER', playerId: players[0].id })
    expect(after.error).toMatch(/complete/i)
    expect(after.playerOneRoster).toHaveLength(ROSTER_SIZE)
    expect(after.playerTwoRoster).toHaveLength(ROSTER_SIZE)
  })
})

describe('draftReducer - weekly reset', () => {
  it('clears rosters, restores the full player pool, resets currentTurn to 1, and adopts the new week id/number', () => {
    let state = initialState(makePlayers(6))
    state = draftReducer(state, { type: 'SELECT_PLAYER', playerId: 'p1' })

    const freshPlayers = makePlayers(6)
    state = draftReducer(state, {
      type: 'RESET_WEEK',
      players: freshPlayers,
      weekId: '2026-09-15',
      weekNumber: 2,
    })

    expect(state.availablePlayers).toEqual(freshPlayers)
    expect(state.playerOneRoster).toHaveLength(0)
    expect(state.playerTwoRoster).toHaveLength(0)
    expect(state.currentTurn).toBe(1)
    expect(state.weekId).toBe('2026-09-15')
    expect(state.weekNumber).toBe(2)
  })
})

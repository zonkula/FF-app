import { describe, expect, it } from 'vitest'
import type { Player, Position } from '../types/player'
import {
  applyPick,
  createLiveDraft,
  isDraftComplete,
  resolveRoster,
  validatePick,
  type LiveDraft,
} from './draftLogic'
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
    espnId: null,
  }
}

function byId(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]))
}

describe('turn alternation', () => {
  it('alternates currentTurn and assigns picks to the correct side', () => {
    const players = Array.from({ length: 6 }, (_, i) => makePlayer(i + 1))
    const playersById = byId(players)
    let draft: LiveDraft = createLiveDraft()

    draft = applyPick(draft, 'player1', 'p1')
    expect(draft.currentTurn).toBe('player2')
    expect(draft.player1Picks).toEqual(['p1'])

    draft = applyPick(draft, 'player2', 'p2')
    expect(draft.currentTurn).toBe('player1')
    expect(draft.player2Picks).toEqual(['p2'])

    draft = applyPick(draft, 'player1', 'p3')
    expect(draft.player1Picks).toEqual(['p1', 'p3'])

    expect(resolveRoster(draft.player1Picks, playersById).map((p) => p.id)).toEqual(['p1', 'p3'])
  })
})

describe('validatePick - picks are locked in', () => {
  it('rejects drafting the same player twice', () => {
    const players = Array.from({ length: 6 }, (_, i) => makePlayer(i + 1))
    const playersById = byId(players)
    let draft = applyPick(createLiveDraft(), 'player1', 'p1')

    const result = validatePick(draft, 'player2', 'p1', playersById)
    expect(result).toEqual({ ok: false, reason: 'Player already drafted.' })
  })

  it('rejects an unknown player id', () => {
    const players = Array.from({ length: 6 }, (_, i) => makePlayer(i + 1))
    const result = validatePick(createLiveDraft(), 'player1', 'not-a-real-id', byId(players))
    expect(result).toEqual({ ok: false, reason: 'Unknown player.' })
  })
})

describe('validatePick - out-of-turn picks', () => {
  it('rejects a pick attempted by the side that is not currently on the clock', () => {
    const players = Array.from({ length: 6 }, (_, i) => makePlayer(i + 1))
    const result = validatePick(createLiveDraft(), 'player2', 'p1', byId(players))
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/turn/i)
  })

  it('accepts a pick attempted by the side that is on the clock', () => {
    const players = Array.from({ length: 6 }, (_, i) => makePlayer(i + 1))
    const result = validatePick(createLiveDraft(), 'player1', 'p1', byId(players))
    expect(result).toEqual({ ok: true })
  })
})

describe('validatePick - position slot limits', () => {
  it('rejects a 2nd QB for the same roster once its QB slot is full', () => {
    const players = [makePlayer(1, 'QB'), makePlayer(2, 'DEF'), makePlayer(3, 'QB')]
    const playersById = byId(players)
    let draft = createLiveDraft()
    draft = applyPick(draft, 'player1', 'p1') // player1's QB slot filled, turn -> player2
    draft = applyPick(draft, 'player2', 'p2') // filler, turn -> player1

    const result = validatePick(draft, 'player1', 'p3', playersById)
    expect(result).toEqual({ ok: false, reason: 'No open QB slot left on that roster.' })
  })
})

describe('isDraftComplete / applyPick completion', () => {
  const SLOT_PATTERN: Position[] = ['QB', 'RB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'TE', 'RB', 'WR', 'K', 'DEF']

  function makeFullDraftPlayers(): Player[] {
    const players: Player[] = []
    let n = 1
    for (const position of SLOT_PATTERN) {
      players.push(makePlayer(n++, position)) // player1's pick
      players.push(makePlayer(n++, position)) // player2's pick
    }
    return players
  }

  it('flags status complete once both sides fill every required slot', () => {
    const players = makeFullDraftPlayers()
    const playersById = byId(players)
    let draft = createLiveDraft()

    for (const player of players) {
      const validation = validatePick(draft, draft.currentTurn, player.id, playersById)
      expect(validation.ok).toBe(true)
      draft = applyPick(draft, draft.currentTurn, player.id)
    }

    expect(draft.player1Picks).toHaveLength(ROSTER_SIZE)
    expect(draft.player2Picks).toHaveLength(ROSTER_SIZE)
    expect(draft.status).toBe('complete')
    expect(isDraftComplete(draft)).toBe(true)

    const after = validatePick(draft, draft.currentTurn, players[0].id, playersById)
    expect(after.ok).toBe(false)
    expect(after.reason).toMatch(/complete/i)
  })
})

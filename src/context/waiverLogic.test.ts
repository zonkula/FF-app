import { describe, expect, it } from 'vitest'
import type { Player, Position } from '../types/player'
import { createLiveDraft, type LiveDraft } from './draftLogic'
import { applyWaiverMove, validateWaiverMove } from './waiverLogic'

function makePlayer(id: string, position: Position): Player {
  return { id, name: id, position, nflTeam: 'AAA', adp: 1, byeWeek: 1, pprPoints: 0, espnId: null }
}

function byId(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]))
}

// A full 13-slot roster for player1: 1 QB, 3 RB, 3 WR, 2 TE, 2 FLEX (extra RB + WR), 1 K, 1 DEF.
function fullRosterDraft(): { draft: LiveDraft; players: Player[] } {
  const roster = [
    makePlayer('qb1', 'QB'),
    makePlayer('rb1', 'RB'),
    makePlayer('rb2', 'RB'),
    makePlayer('rb3', 'RB'),
    makePlayer('wr1', 'WR'),
    makePlayer('wr2', 'WR'),
    makePlayer('wr3', 'WR'),
    makePlayer('te1', 'TE'),
    makePlayer('te2', 'TE'),
    makePlayer('rb4', 'RB'), // FLEX
    makePlayer('wr4', 'WR'), // FLEX
    makePlayer('k1', 'K'),
    makePlayer('def1', 'DEF'),
  ]
  const draft: LiveDraft = {
    ...createLiveDraft(),
    status: 'complete',
    player1Picks: roster.map((p) => p.id),
  }
  return { draft, players: roster }
}

describe('validateWaiverMove', () => {
  it('rejects adding a player already on either roster', () => {
    const { draft, players } = fullRosterDraft()
    const result = validateWaiverMove(draft, 'player1', 'qb1', 'rb1', byId(players))
    expect(result).toEqual({ ok: false, reason: 'That player is already rostered.' })
  })

  it('rejects an unknown player id', () => {
    const { draft, players } = fullRosterDraft()
    const result = validateWaiverMove(draft, 'player1', 'nope', 'rb1', byId(players))
    expect(result).toEqual({ ok: false, reason: 'Unknown player.' })
  })

  it('rejects dropping a player who is not actually on that roster', () => {
    const { draft, players } = fullRosterDraft()
    const newRb = makePlayer('rb5', 'RB')
    const result = validateWaiverMove(draft, 'player1', 'rb5', 'not-on-roster', byId([...players, newRb]))
    expect(result).toEqual({ ok: false, reason: 'That player is not on your roster.' })
  })

  it('rejects adding to a full roster with no drop specified', () => {
    const { draft, players } = fullRosterDraft()
    const newRb = makePlayer('rb5', 'RB')
    const result = validateWaiverMove(draft, 'player1', 'rb5', undefined, byId([...players, newRb]))
    expect(result).toEqual({ ok: false, reason: 'Your roster is full - drop a player first.' })
  })

  it('accepts a same-position swap: drop an RB, add an RB', () => {
    const { draft, players } = fullRosterDraft()
    const newRb = makePlayer('rb5', 'RB')
    const result = validateWaiverMove(draft, 'player1', 'rb5', 'rb1', byId([...players, newRb]))
    expect(result).toEqual({ ok: true })
  })

  it('rejects a swap that would still leave no valid slot (e.g. dropping a K to add a QB)', () => {
    const { draft, players } = fullRosterDraft()
    const newQb = makePlayer('qb2', 'QB')
    const result = validateWaiverMove(draft, 'player1', 'qb2', 'k1', byId([...players, newQb]))
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/QB/)
  })
})

describe('applyWaiverMove', () => {
  it('swaps the dropped player out for the added player, in place', () => {
    const { draft } = fullRosterDraft()
    const next = applyWaiverMove(draft, 'player1', 'rb5', 'rb1')
    expect(next.player1Picks).not.toContain('rb1')
    expect(next.player1Picks).toContain('rb5')
    expect(next.player1Picks).toHaveLength(13)
    // Turn/status are untouched by waiver moves.
    expect(next.currentTurn).toBe(draft.currentTurn)
    expect(next.status).toBe(draft.status)
  })

  it('leaves player2 untouched when player1 makes a move', () => {
    const { draft } = fullRosterDraft()
    const withP2 = { ...draft, player2Picks: ['other1', 'other2'] }
    const next = applyWaiverMove(withP2, 'player1', 'rb5', 'rb1')
    expect(next.player2Picks).toEqual(['other1', 'other2'])
  })
})

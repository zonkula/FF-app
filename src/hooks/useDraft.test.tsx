import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DraftProvider } from '../context/DraftContext'
import type { Player } from '../types/player'
import { useDraft } from './useDraft'

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    position: 'RB',
    nflTeam: 'AAA',
    adp: i + 1,
    byeWeek: 1,
    pprPoints: 100,
  }))
}

function wrapperFor(players: Player[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DraftProvider initialPlayers={players}>{children}</DraftProvider>
  }
}

describe('useDraft', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('throws when used outside a DraftProvider', () => {
    // React logs render errors to console.error even when the caller catches them; silence that expected noise.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useDraft())).toThrow(/DraftProvider/)
    consoleSpy.mockRestore()
  })

  it('alternates turns end-to-end through the hook and locks in picks', () => {
    const players = makePlayers(6)
    const { result } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })

    expect(result.current.currentTurn).toBe(1)

    act(() => result.current.selectPlayer('p1', 1))
    expect(result.current.currentTurn).toBe(2)
    expect(result.current.playerOneRoster.map((p) => p.id)).toEqual(['p1'])

    act(() => result.current.selectPlayer('p2', 2))
    expect(result.current.currentTurn).toBe(1)
    expect(result.current.playerTwoRoster.map((p) => p.id)).toEqual(['p2'])

    // Re-drafting an already-picked player is rejected and does not change whose turn it is.
    act(() => result.current.selectPlayer('p1', 1))
    expect(result.current.error).toBe('Player already drafted.')
    expect(result.current.playerOneRoster).toHaveLength(1)
    expect(result.current.currentTurn).toBe(1)
  })

  it('rejects an out-of-turn pick attempt', () => {
    const players = makePlayers(6)
    const { result } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })

    act(() => result.current.selectPlayer('p1', 2))
    expect(result.current.error).toMatch(/turn/i)
    expect(result.current.playerOneRoster).toHaveLength(0)
    expect(result.current.currentTurn).toBe(1)
  })

  it('rejects a pick once that roster has no open dedicated or FLEX slot for the position', () => {
    // Player 1 drafts 6 RBs in a row (interleaved with Player 2's turns, which draft one filler
    // each so Player 1's turn keeps coming back around): 3 fill the dedicated RB slots, the next
    // 2 spill into the 2 FLEX slots, and the 6th should be rejected outright.
    const players: Player[] = [
      { id: 'rb1', name: 'RB 1', position: 'RB', nflTeam: 'AAA', adp: 1, byeWeek: 1, pprPoints: 100 },
      { id: 'def1', name: 'DEF 1', position: 'DEF', nflTeam: 'AAA', adp: 2, byeWeek: 1, pprPoints: 100 },
      { id: 'rb2', name: 'RB 2', position: 'RB', nflTeam: 'AAA', adp: 3, byeWeek: 1, pprPoints: 100 },
      { id: 'k1', name: 'K 1', position: 'K', nflTeam: 'AAA', adp: 4, byeWeek: 1, pprPoints: 100 },
      { id: 'rb3', name: 'RB 3', position: 'RB', nflTeam: 'AAA', adp: 5, byeWeek: 1, pprPoints: 100 },
      { id: 'te1', name: 'TE 1', position: 'TE', nflTeam: 'AAA', adp: 6, byeWeek: 1, pprPoints: 100 },
      { id: 'rb4', name: 'RB 4', position: 'RB', nflTeam: 'AAA', adp: 7, byeWeek: 1, pprPoints: 100 },
      { id: 'wr1', name: 'WR 1', position: 'WR', nflTeam: 'AAA', adp: 8, byeWeek: 1, pprPoints: 100 },
      { id: 'rb5', name: 'RB 5', position: 'RB', nflTeam: 'AAA', adp: 9, byeWeek: 1, pprPoints: 100 },
      { id: 'qb1', name: 'QB 1', position: 'QB', nflTeam: 'AAA', adp: 10, byeWeek: 1, pprPoints: 100 },
      { id: 'rb6', name: 'RB 6', position: 'RB', nflTeam: 'AAA', adp: 11, byeWeek: 1, pprPoints: 100 },
    ]
    const { result } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })

    for (const id of ['rb1', 'def1', 'rb2', 'k1', 'rb3', 'te1', 'rb4', 'wr1', 'rb5', 'qb1']) {
      act(() => result.current.selectPlayer(id))
      expect(result.current.error).toBeNull()
    }
    expect(result.current.playerOneRoster.filter((p) => p.position === 'RB')).toHaveLength(5)

    act(() => result.current.selectPlayer('rb6'))
    expect(result.current.error).toBe('No open RB or FLEX slot left on that roster.')
    expect(result.current.playerOneRoster.filter((p) => p.position === 'RB')).toHaveLength(5)
  })

  it('persists state to localStorage and rehydrates it on remount', () => {
    const players = makePlayers(6)
    const { result, unmount } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })

    act(() => result.current.selectPlayer('p1', 1))
    unmount()

    const { result: result2 } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })
    expect(result2.current.playerOneRoster.map((p) => p.id)).toEqual(['p1'])
    expect(result2.current.currentTurn).toBe(2)
  })
})

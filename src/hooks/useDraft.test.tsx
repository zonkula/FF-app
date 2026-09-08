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

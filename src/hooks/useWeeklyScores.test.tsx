import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Player } from '../types/player'

const fetchWeeklyScoresMock = vi.fn()

vi.mock('../services/sleeperApi', () => ({
  fetchWeeklyScores: (season: string, week: number) => fetchWeeklyScoresMock(season, week),
}))

vi.mock('../context/PlayersContext', () => ({
  usePlayers: () => ({ players: [], season: '2026', week: 1, loading: false, error: null }),
}))

const { useWeeklyScores } = await import('./useWeeklyScores')

function player(id: string): Player {
  return { id, name: id, position: 'RB', nflTeam: 'AAA', adp: 1, byeWeek: 1, pprPoints: 0 }
}

describe('useWeeklyScores', () => {
  beforeEach(() => {
    fetchWeeklyScoresMock.mockReset()
  })

  it('loads scores for the requested week', async () => {
    fetchWeeklyScoresMock.mockResolvedValue({ p1: 20, p2: 15 })
    const { result } = renderHook(() => useWeeklyScores(1))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.scores).toEqual({ p1: 20, p2: 15 })
    expect(fetchWeeklyScoresMock).toHaveBeenCalledWith('2026', 1)
  })

  it("sums a roster's points from the fetched scores, treating an unscored player as 0", async () => {
    fetchWeeklyScoresMock.mockResolvedValue({ p1: 20, p2: 15 })
    const roster = [player('p1'), player('p2'), player('p3')] // p3 has no entry in scores
    const { result } = renderHook(() => useWeeklyScores(1, roster))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalPoints).toBe(35)
  })

  it('shares one request across two concurrent callers for the same week', async () => {
    let resolveFetch: (value: Record<string, number>) => void = () => {}
    fetchWeeklyScoresMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )

    const rosterA = [player('p1')]
    const rosterB = [player('p2')]
    const hookA = renderHook(() => useWeeklyScores(1, rosterA))
    const hookB = renderHook(() => useWeeklyScores(1, rosterB))

    expect(fetchWeeklyScoresMock).toHaveBeenCalledTimes(1)

    resolveFetch({ p1: 10, p2: 20 })
    await waitFor(() => expect(hookA.result.current.loading).toBe(false))
    await waitFor(() => expect(hookB.result.current.loading).toBe(false))
    expect(hookA.result.current.totalPoints).toBe(10)
    expect(hookB.result.current.totalPoints).toBe(20)
  })

  it('re-fetches on a later call once the previous request has settled', async () => {
    fetchWeeklyScoresMock.mockResolvedValue({ p1: 10 })
    const first = renderHook(() => useWeeklyScores(1))
    await waitFor(() => expect(first.result.current.loading).toBe(false))

    fetchWeeklyScoresMock.mockResolvedValue({ p1: 25 })
    const second = renderHook(() => useWeeklyScores(1))
    await waitFor(() => expect(second.result.current.loading).toBe(false))

    expect(fetchWeeklyScoresMock).toHaveBeenCalledTimes(2)
    expect(second.result.current.scores).toEqual({ p1: 25 })
  })
})

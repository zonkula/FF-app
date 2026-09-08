import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAllPlayers, fetchNflState, fetchWeeklyProjections, fetchWeeklyScores } from './sleeperApi'

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchAllPlayers', () => {
  it('includes team defenses even though they have no status/search_rank fields', async () => {
    const players = {
      // A normal active, ranked player.
      '4984': {
        player_id: '4984',
        full_name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        active: true,
        status: 'Active',
        search_rank: 3,
      },
      // A team defense - matches the real Sleeper shape: no `status`, no `search_rank`.
      HOU: {
        player_id: 'HOU',
        first_name: 'Houston',
        last_name: 'Texans',
        position: 'DEF',
        team: 'HOU',
        active: true,
      },
      // A stale/retired record still tagged `active: true` but without a search_rank - excluded.
      '138': {
        player_id: '138',
        full_name: 'Retired Guy',
        position: 'QB',
        team: 'PIT',
        active: true,
        status: 'Active',
        search_rank: null,
      },
      // A player with no team at all (free agent/retired) - excluded.
      '999': {
        player_id: '999',
        full_name: 'No Team Guy',
        position: 'RB',
        team: null,
        active: true,
        status: 'Active',
        search_rank: 50,
      },
    }
    const schedule = [
      { week: 1, home: 'BUF', away: 'HOU' },
      { week: 2, home: 'HOU', away: 'BUF' },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/players/nfl')) return Promise.resolve(jsonResponse(players))
        if (url.includes('/schedule/')) return Promise.resolve(jsonResponse(schedule))
        throw new Error(`Unexpected fetch: ${url}`)
      }),
    )

    const result = await fetchAllPlayers('2026')

    expect(result.map((p) => p.id).sort()).toEqual(['4984', 'HOU'])
    const def = result.find((p) => p.id === 'HOU')
    expect(def).toMatchObject({ position: 'DEF', nflTeam: 'HOU', name: 'Houston Texans' })
  })
})

describe('fetchNflState', () => {
  it('returns the season and week reported by Sleeper', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ season: '2026', week: 3 }))),
    )
    const state = await fetchNflState()
    expect(state).toEqual({ season: '2026', week: 3 })
  })
})

describe('fetchWeeklyScores', () => {
  it('extracts pts_ppr per player and skips entries without it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            '4984': { pts_ppr: 38.76 },
            '138': { pass_yd: 200 }, // no pts_ppr - didn't play, or stat not reported
          }),
        ),
      ),
    )
    const points = await fetchWeeklyScores('2026', 1)
    expect(points).toEqual({ '4984': 38.76 })
  })
})

describe('fetchWeeklyProjections', () => {
  it('extracts pts_ppr per player from the projections endpoint', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ '4984': { pts_ppr: 23.26 }, '650': { fga: 2 } })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const points = await fetchWeeklyProjections('2026', 1)
    expect(points).toEqual({ '4984': 23.26 })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/projections/nfl/regular/2026/1'))
  })
})

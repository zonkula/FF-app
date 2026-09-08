import { useEffect, useState } from 'react'
import type { Player } from '../types/player'
import { fetchAllPlayers, fetchNflState } from '../services/sleeperApi'
import { cachePlayersInFirebase, getCachedPlayers } from '../utils/firebase'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours - players/teams rarely change more often than that

export interface UseSleeperPlayersResult {
  players: Player[]
  season: string | null
  week: number | null
  loading: boolean
  error: string | null
}

/**
 * Loads the current season's NFL player pool on app start. Checks the shared Firebase cache
 * first (written by whichever client fetched most recently) so the Sleeper API only gets hit
 * once per day across every device, not once per page load.
 */
export function useSleeperPlayers(): UseSleeperPlayersResult {
  const [players, setPlayers] = useState<Player[]>([])
  const [season, setSeason] = useState<string | null>(null)
  const [week, setWeek] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const state = await fetchNflState()
        if (cancelled) return
        setSeason(state.season)
        setWeek(state.week)

        // The Firebase cache is a pure optimization: if it's unreachable (misconfigured,
        // offline, etc.) fall straight through to fetching fresh from Sleeper rather than
        // failing the whole players-load for what is really a caching problem.
        const cached = await getCachedPlayers(state.season).catch(() => null)
        if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          if (!cancelled) {
            setPlayers(cached.players)
            setLoading(false)
          }
          return
        }

        const fresh = await fetchAllPlayers(state.season)
        if (cancelled) return
        setPlayers(fresh)
        setLoading(false)
        // Best-effort: share this fetch with other clients. A failure here shouldn't block the app.
        cachePlayersInFirebase(state.season, fresh).catch(() => {})
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load players from Sleeper.')
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { players, season, week, loading, error }
}

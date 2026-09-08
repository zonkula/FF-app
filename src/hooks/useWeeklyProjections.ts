import { useEffect, useState } from 'react'
import { fetchWeeklyProjections, type WeeklyPoints } from '../services/sleeperApi'
import { usePlayers } from '../context/PlayersContext'

// Mirrors useWeeklyScores' dedup cache: concurrent callers for the same week share one request,
// and the entry is removed once it settles so a later call still gets fresh data.
const inFlightRequests = new Map<string, Promise<WeeklyPoints>>()

function fetchWeeklyProjectionsDeduped(season: string, week: number): Promise<WeeklyPoints> {
  const key = `${season}-${week}`
  let promise = inFlightRequests.get(key)
  if (!promise) {
    promise = fetchWeeklyProjections(season, week).finally(() => inFlightRequests.delete(key))
    inFlightRequests.set(key, promise)
  }
  return promise
}

export interface UseWeeklyProjectionsResult {
  /** playerId -> Sleeper's pre-game PPR projection for that week. */
  projections: WeeklyPoints
  loading: boolean
}

/** Sleeper's pre-game PPR projections for the current NFL week. */
export function useWeeklyProjections(week: number | null): UseWeeklyProjectionsResult {
  const { season } = usePlayers()
  const [projections, setProjections] = useState<WeeklyPoints>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (season == null || week == null) return
    let cancelled = false
    setLoading(true)

    fetchWeeklyProjectionsDeduped(season, week)
      .then((points) => {
        if (!cancelled) setProjections(points)
      })
      .catch(() => {
        if (!cancelled) setProjections({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [season, week])

  return { projections, loading }
}

import { useEffect, useState } from 'react'
import { fetchWeeklyPoints, type WeeklyPoints } from '../services/sleeperApi'

export interface UseWeeklyScoresResult {
  /** playerId -> actual PPR points scored that week. Empty until games have been played/reported. */
  scores: WeeklyPoints
  loading: boolean
}

/** Fetches Sleeper's actual (not projected) PPR scoring for a season/week. */
export function useWeeklyScores(season: string | null, week: number | null): UseWeeklyScoresResult {
  const [scores, setScores] = useState<WeeklyPoints>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (season == null || week == null) return
    let cancelled = false
    setLoading(true)

    fetchWeeklyPoints(season, week)
      .then((points) => {
        if (!cancelled) setScores(points)
      })
      .catch(() => {
        if (!cancelled) setScores({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [season, week])

  return { scores, loading }
}

import { useEffect, useState } from 'react'
import type { Player } from '../types/player'
import { fetchWeeklyScores, type WeeklyPoints } from '../services/sleeperApi'
import { usePlayers } from '../context/PlayersContext'

// Two rosters both asking for the same week's scores in the same render (e.g. player1 vs
// player2) share one in-flight request instead of each hitting Sleeper separately. The entry is
// removed as soon as the request settles - this only dedupes genuinely concurrent callers, it's
// not a long-lived cache, so scores can still be refreshed later (e.g. once games kick off and
// stats start coming in for a week that previously returned nothing).
const inFlightRequests = new Map<string, Promise<WeeklyPoints>>()

function fetchWeeklyScoresDeduped(season: string, week: number): Promise<WeeklyPoints> {
  const key = `${season}-${week}`
  let promise = inFlightRequests.get(key)
  if (!promise) {
    promise = fetchWeeklyScores(season, week).finally(() => inFlightRequests.delete(key))
    inFlightRequests.set(key, promise)
  }
  return promise
}

export interface UseWeeklyScoresResult {
  /** playerId -> actual PPR points scored that week. Empty until games have been played/reported. */
  scores: WeeklyPoints
  /** Sum of `roster`'s PPR points for that week (0 for anyone not yet in `scores`). */
  totalPoints: number
  loading: boolean
}

/** Sleeper's actual (not projected) PPR scoring for a week, optionally summed for one roster. */
export function useWeeklyScores(week: number | null, roster: Player[] = []): UseWeeklyScoresResult {
  const { season } = usePlayers()
  const [scores, setScores] = useState<WeeklyPoints>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (season == null || week == null) return
    let cancelled = false
    setLoading(true)

    fetchWeeklyScoresDeduped(season, week)
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

  const totalPoints = roster.reduce((sum, player) => sum + (scores[player.id] ?? 0), 0)

  return { scores, totalPoints, loading }
}

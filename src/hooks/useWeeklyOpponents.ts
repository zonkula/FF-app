import { useEffect, useState } from 'react'
import { fetchWeeklyOpponents, type WeeklyOpponents } from '../services/sleeperApi'
import { usePlayers } from '../context/PlayersContext'

// Mirrors useWeeklyProjections' dedup cache: concurrent callers for the same week share one
// request, and the entry is removed once it settles so a later call still gets fresh data.
const inFlightRequests = new Map<string, Promise<WeeklyOpponents>>()

function fetchWeeklyOpponentsDeduped(season: string, week: number): Promise<WeeklyOpponents> {
  const key = `${season}-${week}`
  let promise = inFlightRequests.get(key)
  if (!promise) {
    promise = fetchWeeklyOpponents(season, week).finally(() => inFlightRequests.delete(key))
    inFlightRequests.set(key, promise)
  }
  return promise
}

export interface UseWeeklyOpponentsResult {
  /** team abbreviation -> who they play that week. A team missing from this map is on a bye. */
  opponents: WeeklyOpponents
  loading: boolean
}

/** Which team each player's team plays in a given NFL week. */
export function useWeeklyOpponents(week: number | null): UseWeeklyOpponentsResult {
  const { season } = usePlayers()
  const [opponents, setOpponents] = useState<WeeklyOpponents>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (season == null || week == null) return
    let cancelled = false
    setLoading(true)

    fetchWeeklyOpponentsDeduped(season, week)
      .then((data) => {
        if (!cancelled) setOpponents(data)
      })
      .catch(() => {
        if (!cancelled) setOpponents({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [season, week])

  return { opponents, loading }
}

/** "vs KC" / "@ KC" / "BYE" for a team in a given week's opponents map. */
export function formatOpponent(team: string, opponents: WeeklyOpponents): string {
  const entry = opponents[team]
  if (!entry) return 'BYE'
  return `${entry.isHome ? 'vs' : '@'} ${entry.opponent}`
}

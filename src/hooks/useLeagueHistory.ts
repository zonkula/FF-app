import { useEffect, useState } from 'react'
import { subscribeToHistory, type WeekHistoryEntry } from '../utils/firebase'

export interface UseLeagueHistoryResult {
  /** Every completed week on record, oldest first. Updates live if the other player's device saves a new one. */
  history: WeekHistoryEntry[]
  loading: boolean
}

export function useLeagueHistory(): UseLeagueHistoryResult {
  const [history, setHistory] = useState<WeekHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToHistory((next) => {
      setHistory(next)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { history, loading }
}

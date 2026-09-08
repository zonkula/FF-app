import { useEffect, useState } from 'react'
import { getSeasonRecord, type SeasonRecord } from '../utils/firebase'

const EMPTY: SeasonRecord = {
  player1: { wins: 0, losses: 0, ties: 0 },
  player2: { wins: 0, losses: 0, ties: 0 },
}

/**
 * The season's win/loss/tie record for each player, derived from every completed week in
 * `history/` (not a separately-maintained counter, so it can't drift out of sync). Refetches
 * whenever `refreshKey` changes — pass something that changes each time a draft completes.
 */
export function useSeasonRecord(refreshKey: unknown): SeasonRecord {
  const [record, setRecord] = useState<SeasonRecord>(EMPTY)

  useEffect(() => {
    let cancelled = false
    getSeasonRecord()
      .then((result) => {
        if (!cancelled) setRecord(result)
      })
      .catch(() => {
        if (!cancelled) setRecord(EMPTY)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  return record
}

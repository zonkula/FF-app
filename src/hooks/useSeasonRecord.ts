import { computeSeasonRecord, type SeasonRecord } from '../utils/firebase'
import { useLeagueHistory } from './useLeagueHistory'

/** The season's win/loss/tie record for each player, live-updating as history changes. */
export function useSeasonRecord(): SeasonRecord {
  const { history } = useLeagueHistory()
  return computeSeasonRecord(history)
}

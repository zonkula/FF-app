import type { Player } from '../types/player'
import { fetchWeeklyScores } from '../services/sleeperApi'
import { loadDraft, loadDraftHistorySingleWeek, loadRoster, saveDraftHistory, type PlayerHistoryLine } from '../utils/firebase'
import { isDraftComplete } from './draftLogic'
import { slotEntries, SLOT_ORDER, type OrganizedRoster } from './rosterRules'

function flattenRoster(roster: OrganizedRoster | null): Player[] {
  if (!roster) return []
  return SLOT_ORDER.flatMap((slot) => slotEntries(roster, slot))
}

function toHistoryLines(roster: Player[], scores: Record<string, number>): PlayerHistoryLine[] {
  return roster.map((player) => ({
    playerId: player.id,
    name: player.name,
    position: player.position,
    points: scores[player.id] ?? 0,
    nflTeam: player.nflTeam,
  }))
}

/** Scores and records `week`'s result, if it's complete and hasn't been recorded yet. */
async function finalizeWeek(season: string, week: number): Promise<void> {
  const [existing, draft] = await Promise.all([loadDraftHistorySingleWeek(week), loadDraft(week)])
  if (existing || !draft || !isDraftComplete(draft)) return

  const [player1Roster, player2Roster] = await Promise.all([loadRoster(week, 'player1'), loadRoster(week, 'player2')])
  const p1 = flattenRoster(player1Roster)
  const p2 = flattenRoster(player2Roster)
  const scores = await fetchWeeklyScores(season, week)

  const p1Total = p1.reduce((sum, p) => sum + (scores[p.id] ?? 0), 0)
  const p2Total = p2.reduce((sum, p) => sum + (scores[p.id] ?? 0), 0)

  await saveDraftHistory(week, {
    week,
    player1Score: p1Total,
    player2Score: p2Total,
    winner: p1Total === p2Total ? 'tie' : p1Total > p2Total ? 'player1' : 'player2',
    player1Roster: toHistoryLines(p1, scores),
    player2Roster: toHistoryLines(p2, scores),
    completedAt: Date.now(),
  })
}

/**
 * Records final results/winners for every past week that the league has now moved on from but
 * hasn't been scored yet. Called once a new week's draft is confirmed live, so the winner and
 * season standings only lock in once the following week actually starts - not the moment a
 * roster happens to fill up, when the week's games haven't been played yet.
 */
export async function finalizePastWeeks(season: string, currentWeek: number): Promise<void> {
  for (let week = 1; week < currentWeek; week += 1) {
    await finalizeWeek(season, week).catch(() => {})
  }
}

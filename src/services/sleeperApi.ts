import type { Player, Position } from '../types/player'

const SLEEPER_BASE = 'https://api.sleeper.app'
const FANTASY_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

interface SleeperPlayerRaw {
  player_id: string
  full_name?: string
  first_name?: string
  last_name?: string
  position?: string
  team?: string | null
  active?: boolean
  status?: string
  search_rank?: number | null
}

interface SleeperGame {
  week: number
  home: string
  away: string
}

export interface NflState {
  season: string
  week: number
}

/** Sleeper's own notion of "now": which season and week the league is currently in. */
export async function fetchNflState(): Promise<NflState> {
  const res = await fetch(`${SLEEPER_BASE}/v1/state/nfl`)
  if (!res.ok) throw new Error(`Sleeper state request failed: ${res.status}`)
  const data = await res.json()
  return { season: data.season, week: data.week }
}

/**
 * Sleeper's player endpoint doesn't include bye weeks, but its public schedule does: a team's
 * bye is simply the one week in the season it has no game.
 */
async function fetchByeWeeksByTeam(season: string): Promise<Record<string, number>> {
  const res = await fetch(`${SLEEPER_BASE}/schedule/nfl/regular/${season}`)
  if (!res.ok) throw new Error(`Sleeper schedule request failed: ${res.status}`)
  const games: SleeperGame[] = await res.json()

  const teamsByWeek = new Map<number, Set<string>>()
  let maxWeek = 0
  for (const game of games) {
    maxWeek = Math.max(maxWeek, game.week)
    const teams = teamsByWeek.get(game.week) ?? new Set<string>()
    teams.add(game.home)
    teams.add(game.away)
    teamsByWeek.set(game.week, teams)
  }

  const allTeams = new Set<string>()
  teamsByWeek.forEach((teams) => teams.forEach((team) => allTeams.add(team)))

  const byeWeeks: Record<string, number> = {}
  for (const team of allTeams) {
    for (let week = 1; week <= maxWeek; week++) {
      if (!teamsByWeek.get(week)?.has(team)) {
        byeWeeks[team] = week
        break
      }
    }
  }
  return byeWeeks
}

/**
 * All active, fantasy-relevant NFL players from Sleeper, with real bye weeks merged in from the
 * schedule. `search_rank` (Sleeper's own player-prominence ranking) stands in for ADP, since
 * Sleeper's free API doesn't expose draft ADP directly.
 */
export async function fetchAllPlayers(season: string): Promise<Player[]> {
  const [playersRes, byeWeeks] = await Promise.all([
    fetch(`${SLEEPER_BASE}/v1/players/nfl`),
    fetchByeWeeksByTeam(season),
  ])
  if (!playersRes.ok) throw new Error(`Sleeper players request failed: ${playersRes.status}`)
  const raw: Record<string, SleeperPlayerRaw> = await playersRes.json()

  const players: Player[] = []
  for (const p of Object.values(raw)) {
    if (!p.team || !p.active || p.status !== 'Active' || p.search_rank == null) continue
    if (!FANTASY_POSITIONS.includes(p.position as Position)) continue

    players.push({
      id: p.player_id,
      name: p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
      position: p.position as Position,
      nflTeam: p.team,
      adp: p.search_rank,
      byeWeek: byeWeeks[p.team] ?? 0,
      pprPoints: 0,
    })
  }

  return players.sort((a, b) => a.adp - b.adp)
}

/** playerId -> actual PPR fantasy points scored that week. */
export type WeeklyPoints = Record<string, number>

/** Actual (not projected) PPR scoring for every player who played in a given season/week. */
export async function fetchWeeklyPoints(season: string, week: number): Promise<WeeklyPoints> {
  const res = await fetch(`${SLEEPER_BASE}/v1/stats/nfl/regular/${season}/${week}`)
  if (!res.ok) throw new Error(`Sleeper stats request failed: ${res.status}`)
  const raw: Record<string, { pts_ppr?: number }> = await res.json()

  const points: WeeklyPoints = {}
  for (const [playerId, stats] of Object.entries(raw)) {
    if (typeof stats.pts_ppr === 'number') {
      points[playerId] = stats.pts_ppr
    }
  }
  return points
}

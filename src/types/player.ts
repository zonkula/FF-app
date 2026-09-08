export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF'

export interface Player {
  id: string
  name: string
  position: Position
  nflTeam: string
  /** Average draft position, lower = drafted earlier. Realistic range ~1-150. */
  adp: number
  /** NFL bye week, 1-14. */
  byeWeek: number
  /** Projected/actual PPR fantasy points, used for scoring after the draft. */
  pprPoints: number
  /** ESPN's player id, used to build a headshot URL. Null when Sleeper has no mapping (e.g. team defenses). */
  espnId: string | null
}

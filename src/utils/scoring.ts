export interface PlayerStats {
  passingYards: number
  passingTDs: number
  interceptions: number
  rushingYards: number
  rushingTDs: number
  receptions: number
  receivingYards: number
  receivingTDs: number
  fumblesLost: number
}

export function calculatePPRPoints(stats: PlayerStats): number {
  return (
    stats.passingYards * 0.04 +
    stats.passingTDs * 4 +
    stats.interceptions * -2 +
    stats.rushingYards * 0.1 +
    stats.rushingTDs * 6 +
    stats.receptions * 1 +
    stats.receivingYards * 0.1 +
    stats.receivingTDs * 6 +
    stats.fumblesLost * -2
  )
}

import type { Player } from '../types/player'
import { canDraftPosition, describeNoSlotError, ROSTER_SIZE } from './rosterRules'

export type PlayerSlot = 'player1' | 'player2'
export type DraftStatus = 'in-progress' | 'complete'

/** Mirrors exactly what's stored at `ff-league/drafts/week-{N}` — picks are player ids, not full objects. */
export interface LiveDraft {
  status: DraftStatus
  currentTurn: PlayerSlot
  player1Picks: string[]
  player2Picks: string[]
}

export function createLiveDraft(): LiveDraft {
  return { status: 'in-progress', currentTurn: 'player1', player1Picks: [], player2Picks: [] }
}

export function otherSlot(slot: PlayerSlot): PlayerSlot {
  return slot === 'player1' ? 'player2' : 'player1'
}

export function getPicks(draft: Pick<LiveDraft, 'player1Picks' | 'player2Picks'>, slot: PlayerSlot): string[] {
  return slot === 'player1' ? draft.player1Picks : draft.player2Picks
}

/** Resolves a slot's drafted ids into full Player objects, in draft order. Unknown ids are dropped. */
export function resolveRoster(picks: string[], playersById: Map<string, Player>): Player[] {
  const roster: Player[] = []
  for (const id of picks) {
    const player = playersById.get(id)
    if (player) roster.push(player)
  }
  return roster
}

export function isDraftComplete(draft: Pick<LiveDraft, 'player1Picks' | 'player2Picks'>): boolean {
  return draft.player1Picks.length >= ROSTER_SIZE && draft.player2Picks.length >= ROSTER_SIZE
}

export interface PickValidation {
  ok: boolean
  reason?: string
}

/** Everything that can make a pick attempt invalid, checked in the same order every time. */
export function validatePick(
  draft: LiveDraft,
  slot: PlayerSlot,
  playerId: string,
  playersById: Map<string, Player>,
): PickValidation {
  if (isDraftComplete(draft)) {
    return { ok: false, reason: "This week's draft is already complete." }
  }
  if (draft.currentTurn !== slot) {
    const whoseTurn = draft.currentTurn === 'player1' ? 'Player 1' : 'Player 2'
    return { ok: false, reason: `It's ${whoseTurn}'s turn.` }
  }
  if (draft.player1Picks.includes(playerId) || draft.player2Picks.includes(playerId)) {
    return { ok: false, reason: 'Player already drafted.' }
  }
  const player = playersById.get(playerId)
  if (!player) {
    return { ok: false, reason: 'Unknown player.' }
  }
  const roster = resolveRoster(getPicks(draft, slot), playersById)
  if (!canDraftPosition(roster, player.position)) {
    return { ok: false, reason: describeNoSlotError(player.position) }
  }
  return { ok: true }
}

/** Appends the pick, flips the turn, and flags the draft complete once both sides hit ROSTER_SIZE. Assumes the pick already passed validatePick. */
export function applyPick(draft: LiveDraft, slot: PlayerSlot, playerId: string): LiveDraft {
  const picks = [...getPicks(draft, slot), playerId]
  const player1Picks = slot === 'player1' ? picks : draft.player1Picks
  const player2Picks = slot === 'player2' ? picks : draft.player2Picks
  return {
    status: isDraftComplete({ player1Picks, player2Picks }) ? 'complete' : 'in-progress',
    currentTurn: otherSlot(slot),
    player1Picks,
    player2Picks,
  }
}

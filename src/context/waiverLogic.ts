import type { Player } from '../types/player'
import { canDraftPosition, describeNoSlotError } from './rosterRules'
import { getPicks, resolveRoster, type LiveDraft, type PlayerSlot } from './draftLogic'

export interface WaiverMoveValidation {
  ok: boolean
  reason?: string
}

/**
 * Waivers have none of the draft's turn/order restrictions - either side can add or drop
 * anytime. The one rule that still applies is roster construction: a roster is always exactly
 * 13 players grouped into QB/RB/WR/TE/FLEX/K/DEF, so adding almost always means dropping someone
 * else to free the slot first (dropPlayerId is optional only for the rare case of a roster that
 * isn't already full).
 */
export function validateWaiverMove(
  draft: LiveDraft,
  slot: PlayerSlot,
  addPlayerId: string,
  dropPlayerId: string | undefined,
  playersById: Map<string, Player>,
): WaiverMoveValidation {
  if (draft.player1Picks.includes(addPlayerId) || draft.player2Picks.includes(addPlayerId)) {
    return { ok: false, reason: 'That player is already rostered.' }
  }

  const addPlayer = playersById.get(addPlayerId)
  if (!addPlayer) {
    return { ok: false, reason: 'Unknown player.' }
  }

  const currentPicks = getPicks(draft, slot)
  if (dropPlayerId != null && !currentPicks.includes(dropPlayerId)) {
    return { ok: false, reason: 'That player is not on your roster.' }
  }

  const rosterAfterDrop = resolveRoster(
    dropPlayerId != null ? currentPicks.filter((id) => id !== dropPlayerId) : currentPicks,
    playersById,
  )

  if (!canDraftPosition(rosterAfterDrop, addPlayer.position)) {
    return {
      ok: false,
      reason: dropPlayerId != null ? describeNoSlotError(addPlayer.position) : 'Your roster is full - drop a player first.',
    }
  }

  return { ok: true }
}

/** Assumes the move already passed validateWaiverMove. Leaves currentTurn/status untouched. */
export function applyWaiverMove(
  draft: LiveDraft,
  slot: PlayerSlot,
  addPlayerId: string,
  dropPlayerId: string | undefined,
): LiveDraft {
  const currentPicks = getPicks(draft, slot)
  const nextPicks = [...(dropPlayerId != null ? currentPicks.filter((id) => id !== dropPlayerId) : currentPicks), addPlayerId]
  return {
    ...draft,
    player1Picks: slot === 'player1' ? nextPicks : draft.player1Picks,
    player2Picks: slot === 'player2' ? nextPicks : draft.player2Picks,
  }
}

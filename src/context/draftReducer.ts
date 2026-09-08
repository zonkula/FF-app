import type { Player } from '../types/player'
import { canDraftPosition, describeNoSlotError, ROSTER_SIZE } from './rosterRules'

export type Turn = 1 | 2

export interface DraftState {
  availablePlayers: Player[]
  playerOneRoster: Player[]
  playerTwoRoster: Player[]
  currentTurn: Turn
  error: string | null
  /** The current NFL week, as reported by Sleeper. */
  weekNumber: number
  /** Stable id for the draft week (the Tuesday that starts it), used as this draft's Firebase key. */
  weekId: string
}

export type DraftAction =
  | { type: 'SELECT_PLAYER'; playerId: string; asPlayer?: Turn }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_WEEK'; players: Player[]; weekId: string; weekNumber: number }

export function createInitialDraftState(players: Player[], weekId: string, weekNumber: number): DraftState {
  return {
    availablePlayers: players,
    playerOneRoster: [],
    playerTwoRoster: [],
    currentTurn: 1,
    error: null,
    weekNumber,
    weekId,
  }
}

/** Both rosters are full — no more picks can be made until next week's reset. */
export function isDraftComplete(state: Pick<DraftState, 'playerOneRoster' | 'playerTwoRoster'>): boolean {
  return state.playerOneRoster.length >= ROSTER_SIZE && state.playerTwoRoster.length >= ROSTER_SIZE
}

/** Pure reducer, exported so draft logic can be unit tested without rendering React or touching Firebase. */
export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'SELECT_PLAYER': {
      if (isDraftComplete(state)) {
        return { ...state, error: "This week's draft is already complete." }
      }

      if (action.asPlayer !== undefined && action.asPlayer !== state.currentTurn) {
        return { ...state, error: `It's Player ${state.currentTurn}'s turn, not Player ${action.asPlayer}'s.` }
      }

      const player = state.availablePlayers.find((p) => p.id === action.playerId)
      if (!player) {
        const alreadyDrafted =
          state.playerOneRoster.some((p) => p.id === action.playerId) ||
          state.playerTwoRoster.some((p) => p.id === action.playerId)
        return { ...state, error: alreadyDrafted ? 'Player already drafted.' : 'Unknown player.' }
      }

      const currentRoster = state.currentTurn === 1 ? state.playerOneRoster : state.playerTwoRoster
      if (!canDraftPosition(currentRoster, player.position)) {
        return { ...state, error: describeNoSlotError(player.position) }
      }

      const availablePlayers = state.availablePlayers.filter((p) => p.id !== action.playerId)

      return {
        ...state,
        availablePlayers,
        playerOneRoster: state.currentTurn === 1 ? [...state.playerOneRoster, player] : state.playerOneRoster,
        playerTwoRoster: state.currentTurn === 2 ? [...state.playerTwoRoster, player] : state.playerTwoRoster,
        currentTurn: state.currentTurn === 1 ? 2 : 1,
        error: null,
      }
    }
    case 'CLEAR_ERROR':
      return state.error === null ? state : { ...state, error: null }
    case 'RESET_WEEK':
      return createInitialDraftState(action.players, action.weekId, action.weekNumber)
    default:
      return state
  }
}

import { createContext, useCallback, useMemo, useReducer, type ReactNode } from 'react'
import type { Player } from '../types/player'
import { mockPlayers } from '../data/mockPlayers'

export type Turn = 1 | 2

export interface DraftState {
  availablePlayers: Player[]
  playerOneRoster: Player[]
  playerTwoRoster: Player[]
  currentTurn: Turn
}

export type DraftAction = { type: 'SELECT_PLAYER'; playerId: string }

export function createInitialDraftState(players: Player[]): DraftState {
  return {
    availablePlayers: players,
    playerOneRoster: [],
    playerTwoRoster: [],
    currentTurn: 1,
  }
}

/** Pure reducer, exported so draft logic can be unit tested without rendering React. */
export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'SELECT_PLAYER': {
      const player = state.availablePlayers.find((p) => p.id === action.playerId)
      if (!player) {
        // Invalid pick (unknown id or already drafted): no-op.
        return state
      }

      const availablePlayers = state.availablePlayers.filter((p) => p.id !== action.playerId)

      return {
        ...state,
        availablePlayers,
        playerOneRoster: state.currentTurn === 1 ? [...state.playerOneRoster, player] : state.playerOneRoster,
        playerTwoRoster: state.currentTurn === 2 ? [...state.playerTwoRoster, player] : state.playerTwoRoster,
        currentTurn: state.currentTurn === 1 ? 2 : 1,
      }
    }
    default:
      return state
  }
}

export interface DraftContextValue extends DraftState {
  selectPlayer: (playerId: string) => void
}

export const DraftContext = createContext<DraftContextValue | undefined>(undefined)

export interface DraftProviderProps {
  children: ReactNode
  /** Override the player pool, e.g. with a small fixture in tests. Defaults to the full mock database. */
  initialPlayers?: Player[]
}

export function DraftProvider({ children, initialPlayers = mockPlayers }: DraftProviderProps) {
  const [state, dispatch] = useReducer(draftReducer, initialPlayers, createInitialDraftState)

  const selectPlayer = useCallback(
    (playerId: string) => {
      const player = state.availablePlayers.find((p) => p.id === playerId)
      if (!player) {
        throw new Error(`Cannot draft player "${playerId}": not available.`)
      }
      dispatch({ type: 'SELECT_PLAYER', playerId })
    },
    [state.availablePlayers],
  )

  const value = useMemo(() => ({ ...state, selectPlayer }), [state, selectPlayer])

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}

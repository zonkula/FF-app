import { createContext, useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { Player } from '../types/player'
import { mockPlayers } from '../data/mockPlayers'
import { getNextWeeklyResetDate, getWeekId, weeksBetween } from '../utils/season'
import { seededShuffle } from '../utils/shuffle'

export type Turn = 1 | 2

/** Number of picks each player's roster holds before the week's draft is complete. */
export const ROSTER_SIZE = 8

const STORAGE_KEY = 'ff-app:draft-state:v1'

export interface DraftState {
  availablePlayers: Player[]
  playerOneRoster: Player[]
  playerTwoRoster: Player[]
  currentTurn: Turn
  error: string | null
  weekNumber: number
  weekId: string
}

export type DraftAction =
  | { type: 'SELECT_PLAYER'; playerId: string; asPlayer?: Turn }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_WEEK'; players: Player[]; weekId: string; weeksElapsed: number }

export function createInitialDraftState(players: Player[], now: Date = new Date()): DraftState {
  return {
    availablePlayers: players,
    playerOneRoster: [],
    playerTwoRoster: [],
    currentTurn: 1,
    error: null,
    weekNumber: 1,
    weekId: getWeekId(now),
  }
}

/** Both rosters are full — no more picks can be made until next week's reset. */
export function isDraftComplete(state: Pick<DraftState, 'playerOneRoster' | 'playerTwoRoster'>): boolean {
  return state.playerOneRoster.length >= ROSTER_SIZE && state.playerTwoRoster.length >= ROSTER_SIZE
}

/** Pure reducer, exported so draft logic can be unit tested without rendering React. */
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
      return {
        availablePlayers: action.players,
        playerOneRoster: [],
        playerTwoRoster: [],
        currentTurn: 1,
        error: null,
        weekNumber: state.weekNumber + Math.max(1, action.weeksElapsed),
        weekId: action.weekId,
      }
    default:
      return state
  }
}

function loadPersistedState(): DraftState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      !parsed ||
      !Array.isArray(parsed.availablePlayers) ||
      !Array.isArray(parsed.playerOneRoster) ||
      !Array.isArray(parsed.playerTwoRoster) ||
      (parsed.currentTurn !== 1 && parsed.currentTurn !== 2) ||
      typeof parsed.weekNumber !== 'number' ||
      typeof parsed.weekId !== 'string'
    ) {
      return null
    }
    return { ...parsed, error: null }
  } catch {
    return null
  }
}

function persistState(state: DraftState) {
  try {
    const { availablePlayers, playerOneRoster, playerTwoRoster, currentTurn, weekNumber, weekId } = state
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ availablePlayers, playerOneRoster, playerTwoRoster, currentTurn, weekNumber, weekId }),
    )
  } catch {
    // localStorage unavailable (e.g. private browsing) - the draft still works, it just won't survive a refresh.
  }
}

function getInitialState(players: Player[]): DraftState {
  return loadPersistedState() ?? createInitialDraftState(players)
}

export interface DraftContextValue extends DraftState {
  isDraftComplete: boolean
  nextResetAt: Date
  selectPlayer: (playerId: string, asPlayer?: Turn) => void
  clearError: () => void
}

export const DraftContext = createContext<DraftContextValue | undefined>(undefined)

export interface DraftProviderProps {
  children: ReactNode
  /** Override the player pool, e.g. with a small fixture in tests. Defaults to the full mock database. */
  initialPlayers?: Player[]
}

export function DraftProvider({ children, initialPlayers = mockPlayers }: DraftProviderProps) {
  const [state, dispatch] = useReducer(draftReducer, initialPlayers, getInitialState)

  useEffect(() => {
    persistState(state)
  }, [state])

  // Roll over into a new draft week once the Tuesday-midnight boundary is crossed: on mount (covers
  // the app being closed across a reset) and live via a timer while the tab stays open.
  useEffect(() => {
    const rollover = () => {
      const currentWeekId = getWeekId()
      if (currentWeekId === state.weekId) return
      dispatch({
        type: 'RESET_WEEK',
        players: seededShuffle(initialPlayers, currentWeekId),
        weekId: currentWeekId,
        weeksElapsed: weeksBetween(state.weekId, currentWeekId),
      })
    }

    rollover()
    const msUntilNextReset = getNextWeeklyResetDate().getTime() - Date.now()
    const timer = setTimeout(rollover, msUntilNextReset + 250)
    return () => clearTimeout(timer)
  }, [state.weekId, initialPlayers])

  const selectPlayer = useCallback((playerId: string, asPlayer?: Turn) => {
    dispatch({ type: 'SELECT_PLAYER', playerId, asPlayer })
  }, [])

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), [])

  const value = useMemo<DraftContextValue>(
    () => ({
      ...state,
      isDraftComplete: isDraftComplete(state),
      nextResetAt: getNextWeeklyResetDate(),
      selectPlayer,
      clearError,
    }),
    [state, selectPlayer, clearError],
  )

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Player } from '../types/player'
import { ensureAnonymousAuth } from '../config/firebase'
import { applyDraftAction, ensureDraftInitialized, subscribeToDraft } from '../utils/firebase'
import { getNextWeeklyResetDate, getWeekId } from '../utils/season'
import { isDraftComplete as computeIsDraftComplete, type DraftState, type Turn } from './draftReducer'

export type { DraftState, Turn } from './draftReducer'
export { isDraftComplete } from './draftReducer'
export { ROSTER_SIZE } from './rosterRules'

export interface DraftContextValue extends DraftState {
  isDraftComplete: boolean
  /** Whether this device is currently subscribed to live updates from Firebase. */
  isConnected: boolean
  /** Auth/network problems talking to Firebase — distinct from `error`, which is a rejected pick. */
  connectionError: string | null
  nextResetAt: Date
  selectPlayer: (playerId: string, asPlayer?: Turn) => void
  clearError: () => void
}

export const DraftContext = createContext<DraftContextValue | undefined>(undefined)

export interface DraftProviderProps {
  children: ReactNode
  /** The current season's player pool (from useSleeperPlayers). */
  players: Player[]
  /** The current NFL week (from useSleeperPlayers) — becomes this draft's weekNumber. */
  weekNumber: number
}

export function DraftProvider({ children, players, weekNumber }: DraftProviderProps) {
  const [weekId, setWeekId] = useState(() => getWeekId())
  const [state, setState] = useState<DraftState | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Connect to (and, if necessary, initialize) this week's draft node, and subscribe to live
  // updates from every device. Firebase transactions inside ensureDraftInitialized/applyDraftAction
  // make this safe even if two devices race to set up or pick at the same instant.
  useEffect(() => {
    if (players.length === 0) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    setState(null)
    setConnectionError(null)

    async function connect() {
      try {
        await ensureAnonymousAuth()
        await ensureDraftInitialized(weekId, players, weekNumber)
        if (cancelled) return
        unsubscribe = subscribeToDraft(weekId, (remote) => {
          if (!cancelled) setState(remote)
        })
      } catch (err) {
        if (!cancelled) {
          setConnectionError(err instanceof Error ? err.message : 'Failed to connect to Firebase.')
        }
      }
    }

    connect()
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [weekId, players, weekNumber])

  // Roll `weekId` forward once the Tuesday-midnight boundary passes. The effect above reacts to
  // that change by connecting to (and initializing) the new week's draft node.
  useEffect(() => {
    const msUntilNextReset = getNextWeeklyResetDate().getTime() - Date.now()
    const timer = setTimeout(() => {
      const currentWeekId = getWeekId()
      setWeekId((prev) => (currentWeekId !== prev ? currentWeekId : prev))
    }, msUntilNextReset + 250)
    return () => clearTimeout(timer)
  }, [weekId])

  const selectPlayer = useCallback(
    (playerId: string, asPlayer?: Turn) => {
      applyDraftAction(weekId, { type: 'SELECT_PLAYER', playerId, asPlayer }).catch((err) => {
        setConnectionError(err instanceof Error ? err.message : 'Failed to sync pick.')
      })
    },
    [weekId],
  )

  const clearError = useCallback(() => {
    applyDraftAction(weekId, { type: 'CLEAR_ERROR' }).catch(() => {})
  }, [weekId])

  const value = useMemo<DraftContextValue>(() => {
    const shared = {
      isConnected: state !== null,
      connectionError,
      nextResetAt: getNextWeeklyResetDate(),
      selectPlayer,
      clearError,
    }
    if (!state) {
      return {
        availablePlayers: [],
        playerOneRoster: [],
        playerTwoRoster: [],
        currentTurn: 1,
        error: null,
        weekNumber,
        weekId,
        isDraftComplete: false,
        ...shared,
      }
    }
    return { ...state, isDraftComplete: computeIsDraftComplete(state), ...shared }
  }, [state, weekId, weekNumber, connectionError, selectPlayer, clearError])

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Player } from '../types/player'
import { ensureAnonymousAuth } from '../config/firebase'
import {
  ensureDraftInitialized,
  getCurrentWeek,
  logWaiverActivity,
  saveRoster,
  subscribeToDraft,
  submitDraftPick,
  submitWaiverMove,
} from '../utils/firebase'
import { isDraftComplete as computeIsDraftComplete, resolveRoster, type LiveDraft, type PlayerSlot } from './draftLogic'
import { organizeRosterByPosition } from './rosterRules'
import { getNextWeeklyResetDate } from '../utils/season'

export type Turn = 1 | 2
export { ROSTER_SIZE } from './rosterRules'

function turnToSlot(turn: Turn): PlayerSlot {
  return turn === 1 ? 'player1' : 'player2'
}

function slotToTurn(slot: PlayerSlot): Turn {
  return slot === 'player1' ? 1 : 2
}

export interface DraftContextValue {
  availablePlayers: Player[]
  playerOneRoster: Player[]
  playerTwoRoster: Player[]
  currentTurn: Turn
  /** A rejected pick's reason (validation-only; never synced to Firebase, so it's local to this device). */
  error: string | null
  /** This league's own active-week counter (ff-league/activeWeek) — Tuesday-anchored, distinct from Sleeper's NFL week. */
  weekNumber: number
  isDraftComplete: boolean
  /** Whether this device is currently subscribed to live updates from Firebase. */
  isConnected: boolean
  /** Auth/network problems talking to Firebase — distinct from `error`, which is a rejected pick. */
  connectionError: string | null
  nextResetAt: Date
  selectPlayer: (playerId: string, asPlayer?: Turn) => void
  clearError: () => void
  /**
   * Adds a player from the waiver pool, anytime (no turn restriction). `dropPlayerId` is required
   * whenever the roster has no open slot for the new player's position, which after a completed
   * draft is effectively always. Resolves once Firebase has confirmed (or rejected) the move.
   */
  addWaiverPlayer: (playerId: string, asPlayer: Turn, dropPlayerId?: string) => Promise<{ ok: boolean; reason?: string }>
}

export const DraftContext = createContext<DraftContextValue | undefined>(undefined)

export interface DraftProviderProps {
  children: ReactNode
  /** The current season's player pool (from useSleeperPlayers). */
  players: Player[]
}

export function DraftProvider({ children, players }: DraftProviderProps) {
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  const [week, setWeek] = useState<number | null>(null)
  const [draft, setDraft] = useState<LiveDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Authenticate, determine (and roll over, if due) the active week, then subscribe to it live.
  useEffect(() => {
    if (players.length === 0) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    setDraft(null)
    setConnectionError(null)

    async function connect() {
      try {
        await ensureAnonymousAuth()
        const currentWeek = await getCurrentWeek()
        await ensureDraftInitialized(currentWeek)
        if (cancelled) return
        setWeek(currentWeek)
        unsubscribe = subscribeToDraft(currentWeek, (remote) => {
          if (!cancelled) setDraft(remote)
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
  }, [players])

  // While the tab stays open, check again right at the next Tuesday-midnight boundary; if the
  // active week actually moved, the effect above reconnects to the new one.
  useEffect(() => {
    const msUntilNextReset = getNextWeeklyResetDate().getTime() - Date.now()
    const timer = setTimeout(async () => {
      const currentWeek = await getCurrentWeek().catch(() => null)
      if (currentWeek != null) setWeek((prev) => (prev !== currentWeek ? currentWeek : prev))
    }, msUntilNextReset + 250)
    return () => clearTimeout(timer)
  }, [week])

  // Keep rosters/week-{n}/player1|player2 (grouped by lineup slot) in sync with the live picks,
  // so that Firebase location stays meaningful without the app having to remember to call
  // saveRoster explicitly every time a pick happens.
  useEffect(() => {
    if (!draft || week == null) return
    saveRoster(week, 'player1', organizeRosterByPosition(resolveRoster(draft.player1Picks, playersById))).catch(
      () => {},
    )
    saveRoster(week, 'player2', organizeRosterByPosition(resolveRoster(draft.player2Picks, playersById))).catch(
      () => {},
    )
  }, [draft, week, playersById])

  const selectPlayer = useCallback(
    (playerId: string, asPlayer?: Turn) => {
      if (week == null) return
      const slot = asPlayer !== undefined ? turnToSlot(asPlayer) : (draft?.currentTurn ?? 'player1')
      submitDraftPick(week, slot, playerId, playersById)
        .then((result) => setError(result.ok ? null : result.reason))
        .catch((err) => {
          setConnectionError(err instanceof Error ? err.message : 'Failed to sync pick.')
        })
    },
    [week, draft, playersById],
  )

  const clearError = useCallback(() => setError(null), [])

  const addWaiverPlayer = useCallback(
    async (addPlayerId: string, asPlayer: Turn, dropPlayerId?: string) => {
      if (week == null) return { ok: false, reason: 'Not connected yet.' }
      const slot = turnToSlot(asPlayer)
      const result = await submitWaiverMove(week, slot, addPlayerId, dropPlayerId, playersById)
      if (!result.ok) return { ok: false, reason: result.reason }

      const addedPlayer = playersById.get(addPlayerId)
      const droppedPlayer = dropPlayerId != null ? playersById.get(dropPlayerId) : undefined
      logWaiverActivity(week, {
        action: dropPlayerId != null ? 'swap' : 'add',
        by: slot,
        addedPlayerId: addPlayerId,
        addedPlayerName: addedPlayer?.name ?? addPlayerId,
        at: Date.now(),
        ...(dropPlayerId != null
          ? { droppedPlayerId: dropPlayerId, droppedPlayerName: droppedPlayer?.name ?? dropPlayerId }
          : {}),
      }).catch(() => {})

      return { ok: true }
    },
    [week, playersById],
  )

  const value = useMemo<DraftContextValue>(() => {
    const shared = {
      error,
      isConnected: draft !== null,
      connectionError,
      nextResetAt: getNextWeeklyResetDate(),
      selectPlayer,
      clearError,
      addWaiverPlayer,
    }

    if (!draft || week == null) {
      return {
        availablePlayers: [],
        playerOneRoster: [],
        playerTwoRoster: [],
        currentTurn: 1,
        weekNumber: week ?? 1,
        isDraftComplete: false,
        ...shared,
      }
    }

    const draftedIds = new Set([...draft.player1Picks, ...draft.player2Picks])
    return {
      availablePlayers: players.filter((p) => !draftedIds.has(p.id)),
      playerOneRoster: resolveRoster(draft.player1Picks, playersById),
      playerTwoRoster: resolveRoster(draft.player2Picks, playersById),
      currentTurn: slotToTurn(draft.currentTurn),
      weekNumber: week,
      isDraftComplete: computeIsDraftComplete(draft),
      ...shared,
    }
  }, [draft, week, players, playersById, error, connectionError, selectPlayer, clearError, addWaiverPlayer])

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}

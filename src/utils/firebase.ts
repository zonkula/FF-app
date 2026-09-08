import { get, onValue, ref, runTransaction, set, update, type Unsubscribe } from 'firebase/database'
import { getFirebaseDatabase } from '../config/firebase'
import { createInitialDraftState, draftReducer, type DraftAction, type DraftState } from '../context/draftReducer'
import type { Player } from '../types/player'

/**
 * Realtime Database layout:
 *   drafts/{weekId}         live DraftState for that week — every connected device subscribes
 *                           here and sees updates in real time.
 *   leagueHistory/{weekId}  permanent scoring record written once a week's draft completes
 *                           (final rosters + point totals) — survives even after `drafts/{weekId}`
 *                           is superseded by the next week.
 *   users/{uid}             minimal presence record per anonymous session.
 *   playersCache/{season}   cached Sleeper player pool, so clients don't hammer the Sleeper API.
 */

function draftPath(weekId: string): string {
  return `drafts/${weekId}`
}

function historyPath(weekId: string): string {
  return `leagueHistory/${weekId}`
}

/**
 * The Realtime Database silently drops empty arrays/objects on write — a `[]` stored there reads
 * back as `undefined`, not `[]`. Every `DraftState` that comes out of a snapshot goes through this
 * so the rest of the app can keep assuming `availablePlayers`/`playerOneRoster`/`playerTwoRoster`
 * are always real arrays, never `undefined`.
 */
function normalizeDraftState(raw: unknown): DraftState | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<DraftState>
  return {
    availablePlayers: value.availablePlayers ?? [],
    playerOneRoster: value.playerOneRoster ?? [],
    playerTwoRoster: value.playerTwoRoster ?? [],
    currentTurn: value.currentTurn === 2 ? 2 : 1,
    error: value.error ?? null,
    weekNumber: value.weekNumber ?? 1,
    weekId: value.weekId ?? '',
  }
}

// ---- Live draft state ------------------------------------------------------

/** Overwrites the live draft state for a week. Every subscribed device sees this instantly. */
export async function saveDraft(weekId: string, state: DraftState): Promise<void> {
  await set(ref(getFirebaseDatabase(), draftPath(weekId)), state)
}

/** One-time read of a week's draft state (e.g. before a real-time listener attaches). */
export async function loadDraft(weekId: string): Promise<DraftState | null> {
  const snapshot = await get(ref(getFirebaseDatabase(), draftPath(weekId)))
  return normalizeDraftState(snapshot.val())
}

/** Subscribes to real-time updates for a week's draft. Call the returned function to unsubscribe. */
export function subscribeToDraft(weekId: string, onChange: (state: DraftState | null) => void): Unsubscribe {
  return onValue(ref(getFirebaseDatabase(), draftPath(weekId)), (snapshot) => {
    onChange(normalizeDraftState(snapshot.val()))
  })
}

/**
 * Creates the week's draft node if it doesn't exist yet. Safe to call from every device on
 * mount: Firebase transactions guarantee only one of them actually initializes it, so two
 * players opening the app at the same moment never race each other into two different pools.
 */
export async function ensureDraftInitialized(
  weekId: string,
  players: Player[],
  weekNumber: number,
): Promise<DraftState> {
  const result = await runTransaction(ref(getFirebaseDatabase(), draftPath(weekId)), (current: unknown) => {
    return normalizeDraftState(current) ?? createInitialDraftState(players, weekId, weekNumber)
  })
  return normalizeDraftState(result.snapshot.val()) as DraftState
}

/**
 * Applies a draft action (a pick, a turn-clear, etc.) via a Realtime Database transaction: the
 * server re-runs `draftReducer` against whatever the *latest* committed state is if two devices
 * write at nearly the same instant, so two players can never both draft the same player.
 */
export async function applyDraftAction(weekId: string, action: DraftAction): Promise<DraftState> {
  const result = await runTransaction(ref(getFirebaseDatabase(), draftPath(weekId)), (current: unknown) => {
    const state = normalizeDraftState(current)
    if (!state) return current
    return draftReducer(state, action)
  })
  const normalized = normalizeDraftState(result.snapshot.val())
  if (!result.committed || !normalized) {
    throw new Error('Draft has not been initialized for this week yet.')
  }
  return normalized
}

// ---- League history ---------------------------------------------------------

export interface DraftHistoryEntry {
  weekId: string
  weekNumber: number
  playerOneRoster: Player[]
  playerTwoRoster: Player[]
  playerOneScore: number
  playerTwoScore: number
  completedAt: number
}

export async function saveDraftHistory(weekId: string, entry: DraftHistoryEntry): Promise<void> {
  await set(ref(getFirebaseDatabase(), historyPath(weekId)), entry)
}

export async function loadDraftHistory(weekId: string): Promise<DraftHistoryEntry | null> {
  const snapshot = await get(ref(getFirebaseDatabase(), historyPath(weekId)))
  return snapshot.exists() ? (snapshot.val() as DraftHistoryEntry) : null
}

/** Every completed week on record, most recent first. */
export async function loadAllDraftHistory(): Promise<DraftHistoryEntry[]> {
  const snapshot = await get(ref(getFirebaseDatabase(), 'leagueHistory'))
  if (!snapshot.exists()) return []
  const value = snapshot.val() as Record<string, DraftHistoryEntry>
  return Object.values(value).sort((a, b) => b.completedAt - a.completedAt)
}

// ---- Users --------------------------------------------------------------

export async function touchUser(uid: string): Promise<void> {
  await update(ref(getFirebaseDatabase(), `users/${uid}`), { lastSeenAt: Date.now() })
}

// ---- Sleeper player cache -------------------------------------------------

export interface PlayersCache {
  players: Player[]
  fetchedAt: number
}

export async function loadCachedPlayers(season: string): Promise<PlayersCache | null> {
  const snapshot = await get(ref(getFirebaseDatabase(), `playersCache/${season}`))
  return snapshot.exists() ? (snapshot.val() as PlayersCache) : null
}

export async function saveCachedPlayers(season: string, players: Player[]): Promise<void> {
  await set(
    ref(getFirebaseDatabase(), `playersCache/${season}`),
    { players, fetchedAt: Date.now() } satisfies PlayersCache,
  )
}

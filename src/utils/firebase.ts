import { get, onValue, push, ref, runTransaction, set, type Unsubscribe } from 'firebase/database'
import { getFirebaseDatabase } from '../config/firebase'
import {
  applyPick,
  createLiveDraft,
  validatePick,
  type LiveDraft,
  type PlayerSlot,
} from '../context/draftLogic'
import { applyWaiverMove, validateWaiverMove } from '../context/waiverLogic'
import type { OrganizedRoster } from '../context/rosterRules'
import { getNextWeeklyResetDate, ONE_WEEK_MS } from './season'
import type { Player, Position } from '../types/player'

/**
 * Realtime Database layout:
 *   ff-league/
 *     drafts/week-{n}          live picks/turn/status for that week - every device subscribes
 *                              here and sees updates in real time.
 *     rosters/week-{n}/player1 that week's roster grouped by lineup slot (QB/RB/WR/TE/FLEX/K/DEF).
 *     rosters/week-{n}/player2 ...
 *     history/week-{n}         {player1Score, player2Score, winner, per-player breakdowns}
 *                              — the permanent season record, kept forever.
 *     activeWeek               which week-{n} is currently live for drafting.
 *     nextResetDate            epoch ms for the next Tuesday-midnight rollover to a new week.
 *     waiverActivity/week-{n}  append-only audit log of waiver adds/drops (who, what, when).
 *   players/{season}           cached Sleeper player pool (infra, not league data - kept outside
 *                              ff-league).
 */

const ROOT = 'ff-league'

function draftPath(week: number): string {
  return `${ROOT}/drafts/week-${week}`
}

function rosterPath(week: number, slot: PlayerSlot): string {
  return `${ROOT}/rosters/week-${week}/${slot}`
}

function historyPath(week: number): string {
  return `${ROOT}/history/week-${week}`
}

/** The Realtime Database drops empty arrays on write, so a freshly-created draft's `[]` pick
 * lists read back as `undefined`, not `[]`. Every LiveDraft coming out of a snapshot goes through
 * this so the rest of the app can keep assuming the pick arrays are always real arrays. */
function normalizeLiveDraft(raw: unknown): LiveDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<LiveDraft>
  return {
    status: value.status === 'complete' ? 'complete' : 'in-progress',
    currentTurn: value.currentTurn === 'player2' ? 'player2' : 'player1',
    player1Picks: value.player1Picks ?? [],
    player2Picks: value.player2Picks ?? [],
  }
}

function normalizeOrganizedRoster(raw: unknown): OrganizedRoster | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<OrganizedRoster>
  return {
    QB: value.QB ?? null,
    RB: value.RB ?? [],
    WR: value.WR ?? [],
    TE: value.TE ?? [],
    FLEX: value.FLEX ?? [],
    K: value.K ?? null,
    DEF: value.DEF ?? null,
  }
}

// ---- Live draft -------------------------------------------------------------

/** Plain overwrite of a week's draft. For concurrency-safe pick submission use submitDraftPick. */
export async function saveDraft(week: number, draftData: LiveDraft): Promise<void> {
  await set(ref(getFirebaseDatabase(), draftPath(week)), draftData)
}

/** One-time read of a week's draft (e.g. before a real-time listener attaches). */
export async function loadDraft(week: number): Promise<LiveDraft | null> {
  const snapshot = await get(ref(getFirebaseDatabase(), draftPath(week)))
  return normalizeLiveDraft(snapshot.val())
}

/** Subscribes to real-time updates for a week's draft. Call the returned function to unsubscribe. */
export function subscribeToDraft(week: number, onChange: (draft: LiveDraft | null) => void): Unsubscribe {
  return onValue(ref(getFirebaseDatabase(), draftPath(week)), (snapshot) => {
    onChange(normalizeLiveDraft(snapshot.val()))
  })
}

/** Creates the week's draft node if it doesn't exist yet. Safe to call from every device. */
export async function ensureDraftInitialized(week: number): Promise<LiveDraft> {
  const result = await runTransaction(ref(getFirebaseDatabase(), draftPath(week)), (current: unknown) => {
    return normalizeLiveDraft(current) ?? createLiveDraft()
  })
  return normalizeLiveDraft(result.snapshot.val()) as LiveDraft
}

/**
 * Conflict-safe pick submission: re-validates inside a Realtime Database transaction against
 * whatever the *latest* committed draft is, so two devices racing to draft at the same instant
 * can never both succeed on the same player. saveDraft's plain overwrite isn't safe for this -
 * that's what this function is for.
 */
export async function submitDraftPick(
  week: number,
  slot: PlayerSlot,
  playerId: string,
  playersById: Map<string, Player>,
): Promise<{ ok: true; draft: LiveDraft } | { ok: false; reason: string }> {
  let reason: string | null = null

  const result = await runTransaction(ref(getFirebaseDatabase(), draftPath(week)), (current: unknown) => {
    reason = null // reset each time in case Firebase retries this updater under contention
    const draft = normalizeLiveDraft(current)
    if (!draft) {
      reason = 'Draft has not been initialized for this week yet.'
      return current
    }
    const validation = validatePick(draft, slot, playerId, playersById)
    if (!validation.ok) {
      reason = validation.reason ?? 'Invalid pick.'
      return undefined // abort the transaction: nothing is written
    }
    return applyPick(draft, slot, playerId)
  })

  if (reason) return { ok: false, reason }
  if (!result.committed) return { ok: false, reason: 'Pick was rejected by a concurrent update. Try again.' }
  return { ok: true, draft: normalizeLiveDraft(result.snapshot.val()) as LiveDraft }
}

/**
 * Conflict-safe waiver add (optionally paired with a drop, since a full 13-slot roster usually
 * needs one to make room). Unlike submitDraftPick, this has no turn/status gate at all - either
 * side can move anytime, first request to the transaction wins if both try to grab the same
 * player at once.
 */
export async function submitWaiverMove(
  week: number,
  slot: PlayerSlot,
  addPlayerId: string,
  dropPlayerId: string | undefined,
  playersById: Map<string, Player>,
): Promise<{ ok: true; draft: LiveDraft } | { ok: false; reason: string }> {
  let reason: string | null = null

  const result = await runTransaction(ref(getFirebaseDatabase(), draftPath(week)), (current: unknown) => {
    reason = null
    const draft = normalizeLiveDraft(current)
    if (!draft) {
      reason = 'Draft has not been initialized for this week yet.'
      return current
    }
    const validation = validateWaiverMove(draft, slot, addPlayerId, dropPlayerId, playersById)
    if (!validation.ok) {
      reason = validation.reason ?? 'Invalid move.'
      return undefined
    }
    return applyWaiverMove(draft, slot, addPlayerId, dropPlayerId)
  })

  if (reason) return { ok: false, reason }
  if (!result.committed) return { ok: false, reason: 'That move was rejected by a concurrent update. Try again.' }
  return { ok: true, draft: normalizeLiveDraft(result.snapshot.val()) as LiveDraft }
}

export interface WaiverActivityEntry {
  action: 'add' | 'swap'
  by: PlayerSlot
  addedPlayerId: string
  addedPlayerName: string
  droppedPlayerId?: string
  droppedPlayerName?: string
  at: number
}

/** Best-effort audit trail of who added/dropped which player and when - not read back by the UI today. */
export async function logWaiverActivity(week: number, entry: WaiverActivityEntry): Promise<void> {
  await push(ref(getFirebaseDatabase(), `${ROOT}/waiverActivity/week-${week}`), entry)
}

// ---- Rosters (organized by lineup slot) ------------------------------------

/** `playerId` here is the league slot ("player1"/"player2"), not a Sleeper player id. */
export async function saveRoster(week: number, playerId: PlayerSlot, roster: OrganizedRoster): Promise<void> {
  await set(ref(getFirebaseDatabase(), rosterPath(week, playerId)), roster)
}

export async function loadRoster(week: number, playerId: PlayerSlot): Promise<OrganizedRoster | null> {
  const snapshot = await get(ref(getFirebaseDatabase(), rosterPath(week, playerId)))
  return normalizeOrganizedRoster(snapshot.val())
}

// ---- League history ---------------------------------------------------------

export interface PlayerHistoryLine {
  playerId: string
  name: string
  position: Position
  points: number
}

export interface WeekHistoryEntry {
  week: number
  player1Score: number
  player2Score: number
  winner: PlayerSlot | 'tie'
  player1Roster: PlayerHistoryLine[]
  player2Roster: PlayerHistoryLine[]
  completedAt: number
}

export async function saveDraftHistory(week: number, results: WeekHistoryEntry): Promise<void> {
  await set(ref(getFirebaseDatabase(), historyPath(week)), results)
}

export async function loadDraftHistorySingleWeek(week: number): Promise<WeekHistoryEntry | null> {
  const snapshot = await get(ref(getFirebaseDatabase(), historyPath(week)))
  return (snapshot.val() as WeekHistoryEntry | null) ?? null
}

function parseHistorySnapshot(raw: unknown): WeekHistoryEntry[] {
  if (!raw) return []
  const value = raw as Record<string, WeekHistoryEntry>
  return Object.values(value).sort((a, b) => a.week - b.week)
}

/** Every completed week on record, sorted oldest first (the "reflect on the year" view). */
export async function loadDraftHistory(): Promise<WeekHistoryEntry[]> {
  const snapshot = await get(ref(getFirebaseDatabase(), `${ROOT}/history`))
  return parseHistorySnapshot(snapshot.val())
}

/** Live updates to the full history list - so Standings/Matchup reflect a newly-completed week
 * on the other player's device without a manual refresh. */
export function subscribeToHistory(onChange: (history: WeekHistoryEntry[]) => void): Unsubscribe {
  return onValue(ref(getFirebaseDatabase(), `${ROOT}/history`), (snapshot) => {
    onChange(parseHistorySnapshot(snapshot.val()))
  })
}

export interface SeasonRecord {
  player1: { wins: number; losses: number; ties: number }
  player2: { wins: number; losses: number; ties: number }
}

/** Pure and synchronous so it can be reused by both a one-off fetch and a live subscription. */
export function computeSeasonRecord(history: WeekHistoryEntry[]): SeasonRecord {
  const record: SeasonRecord = {
    player1: { wins: 0, losses: 0, ties: 0 },
    player2: { wins: 0, losses: 0, ties: 0 },
  }
  for (const entry of history) {
    if (entry.winner === 'player1') {
      record.player1.wins += 1
      record.player2.losses += 1
    } else if (entry.winner === 'player2') {
      record.player2.wins += 1
      record.player1.losses += 1
    } else {
      record.player1.ties += 1
      record.player2.ties += 1
    }
  }
  return record
}

/** Derived from history rather than a separately-maintained counter, so it can never drift out of sync. */
export async function getSeasonRecord(): Promise<SeasonRecord> {
  return computeSeasonRecord(await loadDraftHistory())
}

// ---- Active week / weekly reset clock --------------------------------------

/**
 * Checks whether the Tuesday-midnight boundary has passed since the stored nextResetDate, and if
 * so advances activeWeek (by more than 1 if the app wasn't opened for several weeks) and
 * initializes that new week's draft node. Safe to call from every device — activeWeek and
 * nextResetDate are each updated via their own small transaction.
 */
export async function updateActiveWeek(): Promise<number> {
  const db = getFirebaseDatabase()
  const now = Date.now()

  const existing = await get(ref(db, `${ROOT}/nextResetDate`))
  if (!existing.exists()) {
    // First time this league has ever run: bootstrap week 1. Transactions guard both fields so
    // two devices loading the app for the first time at once can't disagree on the start point.
    await runTransaction(ref(db, `${ROOT}/nextResetDate`), (current: number | null) => {
      return current ?? getNextWeeklyResetDate(new Date(now)).getTime()
    })
    await runTransaction(ref(db, `${ROOT}/activeWeek`), (current: number | null) => current ?? 1)
    await ensureDraftInitialized(1)
    return 1
  }

  let weeksElapsed = 0
  await runTransaction(ref(db, `${ROOT}/nextResetDate`), (current: number | null) => {
    weeksElapsed = 0
    if (current == null) return current
    let next = current
    while (now >= next) {
      next += ONE_WEEK_MS
      weeksElapsed += 1
    }
    return weeksElapsed > 0 ? next : current
  })

  if (weeksElapsed === 0) {
    const weekSnap = await get(ref(db, `${ROOT}/activeWeek`))
    return weekSnap.exists() ? (weekSnap.val() as number) : 1
  }

  const weekResult = await runTransaction(ref(db, `${ROOT}/activeWeek`), (current: number | null) => {
    return (current ?? 1) + weeksElapsed
  })
  const week = weekResult.snapshot.val() as number
  await ensureDraftInitialized(week)
  return week
}

/** The week currently live for drafting, rolling the league forward first if a reset is due. */
export async function getCurrentWeek(): Promise<number> {
  return updateActiveWeek()
}

// ---- Admin operations -------------------------------------------------------

/**
 * Force-advances to a brand new week immediately, regardless of whether the Tuesday-midnight
 * boundary has actually passed. Unlike updateActiveWeek's natural rollover, this is an explicit
 * override — for correcting a mistake or starting the league ahead of schedule.
 */
export async function initializeNewDraftWeek(): Promise<number> {
  const db = getFirebaseDatabase()
  const weekResult = await runTransaction(ref(db, `${ROOT}/activeWeek`), (current: number | null) => (current ?? 0) + 1)
  const newWeek = weekResult.snapshot.val() as number
  await runTransaction(ref(db, `${ROOT}/nextResetDate`), () => getNextWeeklyResetDate().getTime())
  await set(ref(db, draftPath(newWeek)), createLiveDraft())
  return newWeek
}

/** Clears this week's picks and both rosters and resets the turn to player1, without touching the week number. */
export async function resetCurrentWeekDraft(week: number): Promise<void> {
  const db = getFirebaseDatabase()
  await set(ref(db, draftPath(week)), createLiveDraft())
  await set(ref(db, rosterPath(week, 'player1')), null)
  await set(ref(db, rosterPath(week, 'player2')), null)
}

/** Permanently deletes every completed week's record. Irreversible - the caller should confirm first. */
export async function clearAllHistory(): Promise<void> {
  await set(ref(getFirebaseDatabase(), `${ROOT}/history`), null)
}

export interface LeagueMeta {
  activeWeek: number | null
  nextResetDate: number | null
}

export async function loadLeagueMeta(): Promise<LeagueMeta> {
  const db = getFirebaseDatabase()
  const [weekSnap, resetSnap] = await Promise.all([
    get(ref(db, `${ROOT}/activeWeek`)),
    get(ref(db, `${ROOT}/nextResetDate`)),
  ])
  return {
    activeWeek: weekSnap.exists() ? (weekSnap.val() as number) : null,
    nextResetDate: resetSnap.exists() ? (resetSnap.val() as number) : null,
  }
}

/** The entire `ff-league` tree, for a read-only admin debug view. */
export async function loadLeagueSnapshot(): Promise<unknown> {
  const snapshot = await get(ref(getFirebaseDatabase(), ROOT))
  return snapshot.val()
}

// ---- Sleeper player cache (players/{season}) -------------------------------

export interface PlayersCache {
  players: Player[]
  fetchedAt: number
}

/** Reads the cached player pool for a season, so clients don't hammer the Sleeper API. */
export async function getCachedPlayers(season: string): Promise<PlayersCache | null> {
  const snapshot = await get(ref(getFirebaseDatabase(), `players/${season}`))
  return snapshot.exists() ? (snapshot.val() as PlayersCache) : null
}

/** Shares a freshly-fetched player pool with every other client for the rest of the cache TTL. */
export async function cachePlayersInFirebase(season: string, players: Player[]): Promise<void> {
  await set(
    ref(getFirebaseDatabase(), `players/${season}`),
    { players, fetchedAt: Date.now() } satisfies PlayersCache,
  )
}

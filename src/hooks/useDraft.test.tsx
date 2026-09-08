import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fakeFirebase from '../test/fakeFirebase'

// utils/firebase.ts calls the Realtime Database SDK directly, so that still needs faking here.
vi.mock('firebase/database', () => ({
  getDatabase: fakeFirebase.getDatabase,
  ref: fakeFirebase.ref,
  get: fakeFirebase.get,
  set: fakeFirebase.set,
  update: fakeFirebase.update,
  push: fakeFirebase.push,
  onValue: fakeFirebase.onValue,
  runTransaction: fakeFirebase.runTransaction,
}))

// config/firebase.ts is mocked wholesale (rather than faking firebase/app + firebase/auth
// underneath it) so these tests never depend on real project credentials being present in
// .env — only on the fake in-memory store below.
vi.mock('../config/firebase', () => ({
  isFirebaseConfigured: true,
  getFirebaseDatabase: fakeFirebase.getDatabase,
  ensureAnonymousAuth: async () => {
    const auth = fakeFirebase.getAuth()
    await fakeFirebase.signInAnonymously(auth)
    return auth.currentUser
  },
}))

// Imported after the mocks above so DraftContext (via config/firebase and utils/firebase) picks
// up the fakes instead of trying to reach real Firebase servers.
const { DraftProvider } = await import('../context/DraftContext')
const { useDraft } = await import('./useDraft')

import type { Player } from '../types/player'

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    position: 'RB',
    nflTeam: 'AAA',
    adp: i + 1,
    byeWeek: 1,
    pprPoints: 100,
    espnId: null,
  }))
}

function wrapperFor(players: Player[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DraftProvider players={players}>{children}</DraftProvider>
  }
}

describe('useDraft (Firebase-backed)', () => {
  beforeEach(() => {
    fakeFirebase.fakeStore.reset()
  })

  it('throws when used outside a DraftProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useDraft())).toThrow(/DraftProvider/)
    consoleSpy.mockRestore()
  })

  it('connects, initializes the week in Firebase, and exposes the starting state', async () => {
    const players = makePlayers(6)
    const { result } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })

    await waitFor(() => expect(result.current.isConnected).toBe(true))
    expect(result.current.currentTurn).toBe(1)
    expect(result.current.availablePlayers).toHaveLength(6)
    expect(result.current.playerOneRoster).toHaveLength(0)
  })

  it('alternates turns end-to-end through Firebase and locks in picks', async () => {
    const players = makePlayers(6)
    const { result } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    await act(async () => result.current.selectPlayer('p1', 1))
    await waitFor(() => expect(result.current.currentTurn).toBe(2))
    expect(result.current.playerOneRoster.map((p) => p.id)).toEqual(['p1'])

    await act(async () => result.current.selectPlayer('p2', 2))
    await waitFor(() => expect(result.current.currentTurn).toBe(1))
    expect(result.current.playerTwoRoster.map((p) => p.id)).toEqual(['p2'])

    // Re-drafting an already-picked player is rejected and does not change whose turn it is.
    await act(async () => result.current.selectPlayer('p1', 1))
    await waitFor(() => expect(result.current.error).toBe('Player already drafted.'))
    expect(result.current.playerOneRoster).toHaveLength(1)
    expect(result.current.currentTurn).toBe(1)
  })

  it('rejects an out-of-turn pick attempt', async () => {
    const players = makePlayers(6)
    const { result } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    await act(async () => result.current.selectPlayer('p1', 2))
    await waitFor(() => expect(result.current.error).toMatch(/turn/i))
    expect(result.current.playerOneRoster).toHaveLength(0)
    expect(result.current.currentTurn).toBe(1)
  })

  it('both devices see a pick applied by only one of them, in real time', async () => {
    const players = makePlayers(6)
    const wrapper = wrapperFor(players)

    // Two independent hook instances against the same Firebase (fake) backend = two devices.
    const deviceA = renderHook(() => useDraft(), { wrapper })
    const deviceB = renderHook(() => useDraft(), { wrapper })

    await waitFor(() => expect(deviceA.result.current.isConnected).toBe(true))
    await waitFor(() => expect(deviceB.result.current.isConnected).toBe(true))

    // Player 1 drafts from device A, without device B ever calling selectPlayer itself.
    await act(async () => deviceA.result.current.selectPlayer('p1', 1))

    await waitFor(() => expect(deviceB.result.current.playerOneRoster.map((p) => p.id)).toEqual(['p1']))
    expect(deviceB.result.current.currentTurn).toBe(2)
    // Device A sees its own write reflected back the same way, through the same sync path.
    expect(deviceA.result.current.playerOneRoster.map((p) => p.id)).toEqual(['p1'])
  })

  describe('addWaiverPlayer', () => {
    // Two full 13-slot rosters (1 QB, 3 RB, 3 WR, 2 TE, 2 FLEX, 1 K, 1 DEF each), plus a few
    // spare bench-eligible players left in the pool for waiver tests to add.
    const SLOT_PATTERN: Player['position'][] = [
      'QB', 'RB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'TE', 'RB', 'WR', 'K', 'DEF',
    ]

    function makeFullDraftPlayers(): Player[] {
      const players: Player[] = []
      let n = 1
      for (const position of SLOT_PATTERN) {
        for (let i = 0; i < 2; i++) {
          players.push({
            id: `p${n}`,
            name: `Player ${n}`,
            position,
            nflTeam: 'AAA',
            adp: n,
            byeWeek: 1,
            pprPoints: 0,
            espnId: null,
          })
          n++
        }
      }
      // A few spare players for waiver adds: an extra RB and an extra QB.
      players.push({ id: 'waiver-rb', name: 'Waiver RB', position: 'RB', nflTeam: 'AAA', adp: 999, byeWeek: 1, pprPoints: 0, espnId: null })
      players.push({ id: 'waiver-qb', name: 'Waiver QB', position: 'QB', nflTeam: 'AAA', adp: 999, byeWeek: 1, pprPoints: 0, espnId: null })
      return players
    }

    async function draftToCompletion(result: { current: ReturnType<typeof useDraft> }, players: Player[]) {
      const draftPicks = players.filter((p) => !p.id.startsWith('waiver-'))
      for (const player of draftPicks) {
        await act(async () => result.current.selectPlayer(player.id))
      }
      await waitFor(() => expect(result.current.isDraftComplete).toBe(true))
    }

    it('adds a player anytime with no turn restriction, given a same-position drop', async () => {
      const players = makeFullDraftPlayers()
      const { result } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })
      await waitFor(() => expect(result.current.isConnected).toBe(true))
      await draftToCompletion(result, players)

      const player1RbId = result.current.playerOneRoster.find((p) => p.position === 'RB')!.id

      // Player 2 moves immediately after player1's last pick - no "whose turn" gate for waivers.
      let moveResult
      await act(async () => {
        moveResult = await result.current.addWaiverPlayer('waiver-rb', 1, player1RbId)
      })
      expect(moveResult).toEqual({ ok: true })
      await waitFor(() => expect(result.current.playerOneRoster.map((p) => p.id)).toContain('waiver-rb'))
      expect(result.current.playerOneRoster.map((p) => p.id)).not.toContain(player1RbId)
      expect(result.current.availablePlayers.map((p) => p.id)).toContain(player1RbId)
    })

    it('rejects an add with no drop when the roster is already full', async () => {
      const players = makeFullDraftPlayers()
      const { result } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })
      await waitFor(() => expect(result.current.isConnected).toBe(true))
      await draftToCompletion(result, players)

      let moveResult
      await act(async () => {
        moveResult = await result.current.addWaiverPlayer('waiver-rb', 1)
      })
      expect(moveResult).toEqual({ ok: false, reason: "Your roster is full - drop a player first." })
    })

    it('rejects a swap that leaves no valid slot for the added position', async () => {
      const players = makeFullDraftPlayers()
      const { result } = renderHook(() => useDraft(), { wrapper: wrapperFor(players) })
      await waitFor(() => expect(result.current.isConnected).toBe(true))
      await draftToCompletion(result, players)

      const kickerId = result.current.playerOneRoster.find((p) => p.position === 'K')!.id
      let moveResult: { ok: boolean; reason?: string } | undefined
      await act(async () => {
        moveResult = await result.current.addWaiverPlayer('waiver-qb', 1, kickerId)
      })
      expect(moveResult?.ok).toBe(false)
      expect(moveResult?.reason).toMatch(/QB/)
    })

    it('both devices see a waiver add applied by only one of them, in real time', async () => {
      const players = makeFullDraftPlayers()
      const wrapper = wrapperFor(players)
      const deviceA = renderHook(() => useDraft(), { wrapper })
      const deviceB = renderHook(() => useDraft(), { wrapper })
      await waitFor(() => expect(deviceA.result.current.isConnected).toBe(true))
      await draftToCompletion(deviceA.result, players)
      await waitFor(() => expect(deviceB.result.current.isDraftComplete).toBe(true))

      const player2RbId = deviceB.result.current.playerTwoRoster.find((p) => p.position === 'RB')!.id
      await act(async () => deviceA.result.current.addWaiverPlayer('waiver-rb', 2, player2RbId))

      await waitFor(() => expect(deviceB.result.current.playerTwoRoster.map((p) => p.id)).toContain('waiver-rb'))
      expect(deviceB.result.current.playerTwoRoster.map((p) => p.id)).not.toContain(player2RbId)
    })
  })
})

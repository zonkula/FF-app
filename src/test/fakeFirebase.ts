/**
 * A minimal in-memory stand-in for the slice of the Firebase JS SDK this app uses (app/auth/
 * database). Lets DraftContext, utils/firebase.ts, and config/firebase.ts be exercised in tests
 * with no network access and no real project credentials, while still going through the exact
 * same transaction/subscription code paths as production.
 *
 * Two independent `ref(...)`/`onValue(...)` subscriptions to the same path (simulating two
 * devices/browser tabs) both observe every `set`/`runTransaction` write to that path — which is
 * the property the real Firebase Realtime Database provides and this app's real-time sync
 * depends on.
 */

type Listener = (value: unknown) => void

/**
 * The real Realtime Database silently drops empty arrays/objects (and `undefined`s) on write —
 * writing `{ roster: [] }` leaves no `roster` key at all when read back. Reproducing that here
 * (rather than storing values as-is) is what caught the real bug this fake originally missed:
 * DraftContext code that assumed `state.playerOneRoster` was always an array crashed the moment
 * it round-tripped through a real database with an empty roster.
 */
function sanitizeForStorage(value: unknown): unknown {
  if (value === undefined) return undefined
  if (Array.isArray(value)) {
    const items = value.map(sanitizeForStorage).filter((item) => item !== undefined)
    return items.length === 0 ? undefined : items
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      const sanitized = sanitizeForStorage(val)
      if (sanitized !== undefined) result[key] = sanitized
    }
    return Object.keys(result).length === 0 ? undefined : result
  }
  return value
}

class FakeDatabaseStore {
  private data = new Map<string, unknown>()
  private listeners = new Map<string, Set<Listener>>()

  get(path: string): unknown {
    return this.data.has(path) ? this.data.get(path) : null
  }

  set(path: string, value: unknown): void {
    this.write(path, sanitizeForStorage(value))
    this.notify(path)
  }

  update(path: string, patch: Record<string, unknown>): void {
    const current = (this.data.get(path) as Record<string, unknown> | undefined) ?? {}
    this.write(path, sanitizeForStorage({ ...current, ...patch }))
    this.notify(path)
  }

  /** Mirrors Firebase's transaction semantics: an `undefined` return aborts without writing. */
  transaction(path: string, updater: (current: unknown) => unknown): { committed: boolean; value: unknown } {
    const next = updater(this.get(path))
    if (next === undefined) {
      return { committed: false, value: this.get(path) }
    }
    this.write(path, sanitizeForStorage(next))
    this.notify(path)
    return { committed: true, value: this.get(path) }
  }

  private write(path: string, sanitized: unknown): void {
    if (sanitized === undefined) {
      this.data.delete(path)
    } else {
      this.data.set(path, sanitized)
    }
  }

  subscribe(path: string, listener: Listener): () => void {
    const listeners = this.listeners.get(path) ?? new Set<Listener>()
    listeners.add(listener)
    this.listeners.set(path, listeners)
    queueMicrotask(() => listener(this.get(path)))
    return () => listeners.delete(listener)
  }

  private notify(path: string) {
    this.listeners.get(path)?.forEach((listener) => listener(this.get(path)))
  }

  reset(): void {
    this.data.clear()
    this.listeners.clear()
  }
}

export const fakeStore = new FakeDatabaseStore()

// ---- firebase/app ----

export function initializeApp() {
  return {}
}

// ---- firebase/auth ----

interface FakeAuth {
  currentUser: { uid: string } | null
}

export function getAuth(): FakeAuth {
  return { currentUser: null }
}

export function signInAnonymously(auth: FakeAuth) {
  auth.currentUser = { uid: 'fake-uid' }
  return Promise.resolve({ user: auth.currentUser })
}

export function onAuthStateChanged(auth: FakeAuth, onNext: (user: FakeAuth['currentUser']) => void) {
  // Deferred so a synchronous signInAnonymously() call right after this still "wins the race",
  // matching how real Firebase delivers auth state asynchronously.
  queueMicrotask(() => onNext(auth.currentUser))
  return () => {}
}

// ---- firebase/database ----

export function getDatabase() {
  return {}
}

export function ref(_db: unknown, path: string) {
  return { path }
}

export async function get(refObj: { path: string }) {
  const value = fakeStore.get(refObj.path)
  return { exists: () => value != null, val: () => value }
}

export async function set(refObj: { path: string }, value: unknown) {
  fakeStore.set(refObj.path, value)
}

export async function update(refObj: { path: string }, patch: Record<string, unknown>) {
  fakeStore.update(refObj.path, patch)
}

export function onValue(refObj: { path: string }, onNext: (snapshot: { exists: () => boolean; val: () => unknown }) => void) {
  return fakeStore.subscribe(refObj.path, (value) => {
    onNext({ exists: () => value != null, val: () => value })
  })
}

export async function runTransaction(refObj: { path: string }, updater: (current: unknown) => unknown) {
  const result = fakeStore.transaction(refObj.path, updater)
  return {
    committed: result.committed,
    snapshot: { exists: () => result.value != null, val: () => result.value },
  }
}

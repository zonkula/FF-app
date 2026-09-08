import { ref, set } from 'firebase/database'
import { getFirebaseDatabase } from '../config/firebase'
import type { PlayerName } from '../utils/playerNames'

const STORAGE_KEY = 'ff-app:auth-user'

// Hardcoded on purpose - this is a private 2-person app, not a real access-control boundary.
const PASSWORDS: Record<string, PlayerName> = {
  Colin: 'Zonk',
  Kylan: 'KBrakke',
}

export interface LoginResult {
  user: PlayerName | null
  error: string | null
}

function persistLocally(user: PlayerName): void {
  try {
    localStorage.setItem(STORAGE_KEY, user)
  } catch {
    // localStorage unavailable (e.g. private browsing) - the session just won't survive a refresh.
  }
}

/** Checks the password, persists the session locally, and best-effort logs it in Firebase. */
export async function login(password: string): Promise<LoginResult> {
  const user = PASSWORDS[password]
  if (!user) {
    return { user: null, error: 'Incorrect password.' }
  }

  persistLocally(user)

  // Fire-and-forget: this is an audit trail nothing reads back today, not something the user
  // should have to wait on a network round-trip for before they're considered logged in.
  set(ref(getFirebaseDatabase(), `ff-league/sessions/${user}`), { loggedInAt: Date.now() }).catch(() => {})

  return { user, error: null }
}

export function logout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clean up if localStorage isn't available in the first place.
  }
}

/** Reads whichever user this browser was last logged in as, if any. */
export function getStoredUser(): PlayerName | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'Zonk' || value === 'KBrakke' ? value : null
  } catch {
    return null
  }
}

import { useCallback, useEffect, useState } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { ensureAnonymousAuth } from '../config/firebase'
import {
  clearAllHistory,
  initializeNewDraftWeek,
  loadLeagueMeta,
  loadLeagueSnapshot,
  resetCurrentWeekDraft,
  resetEntireSeason,
  type LeagueMeta,
} from '../utils/firebase'

export function AdminPage() {
  const { isAuthenticated } = useAdminAuth()
  return isAuthenticated ? <AdminDashboard /> : <AdminLoginForm />
}

function AdminLoginForm() {
  const { login } = useAdminAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (login(password)) {
      setError(null)
      setPassword('')
    } else {
      setError('Incorrect password.')
    }
  }

  return (
    <div className="mx-auto max-w-sm p-8">
      <h2 className="mb-4 text-center text-lg font-semibold text-gray-100">Admin login</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="min-h-[48px] w-full rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-gray-100 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="min-h-[48px] w-full rounded-md bg-sky-600 px-3 text-sm font-medium text-white hover:bg-sky-500"
        >
          Log in
        </button>
      </form>
    </div>
  )
}

function formatDate(ms: number | null): string {
  if (ms == null) return '—'
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function AdminDashboard() {
  const { logout } = useAdminAuth()
  const [meta, setMeta] = useState<LeagueMeta>({ activeWeek: null, nextResetDate: null })
  const [snapshot, setSnapshot] = useState<unknown>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmingClearHistory, setConfirmingClearHistory] = useState(false)
  const [confirmingResetSeason, setConfirmingResetSeason] = useState(false)

  const refresh = useCallback(async () => {
    await ensureAnonymousAuth()
    const [nextMeta, nextSnapshot] = await Promise.all([loadLeagueMeta(), loadLeagueSnapshot()])
    setMeta(nextMeta)
    setSnapshot(nextSnapshot)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function runAction(label: string, action: () => Promise<void>) {
    setBusy(true)
    setStatus(label)
    try {
      await ensureAnonymousAuth()
      await action()
      await refresh()
      setStatus(`${label} — done.`)
    } catch (err) {
      setStatus(`${label} — failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const handleInitializeNewDraft = () =>
    runAction('Initializing new draft week', async () => {
      await initializeNewDraftWeek()
    })

  const handleResetWeek = () =>
    runAction("Resetting this week's draft", async () => {
      if (meta.activeWeek == null) throw new Error('No active week to reset.')
      await resetCurrentWeekDraft(meta.activeWeek)
    })

  const handleClearHistory = () => {
    if (!confirmingClearHistory) {
      setConfirmingClearHistory(true)
      return
    }
    setConfirmingClearHistory(false)
    runAction('Clearing all history', clearAllHistory)
  }

  const handleResetSeason = () => {
    if (!confirmingResetSeason) {
      setConfirmingResetSeason(true)
      return
    }
    setConfirmingResetSeason(false)
    runAction('Resetting entire season', resetEntireSeason)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">Admin</h2>
        <button
          onClick={logout}
          className="min-h-[44px] rounded-md border border-gray-700 px-3 text-xs font-medium text-gray-300 hover:bg-gray-800"
        >
          Log out
        </button>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-sm text-gray-300">
        <p>
          Active week: <span className="font-semibold text-gray-100">{meta.activeWeek ?? '—'}</span>
        </p>
        <p>
          Next reset: <span className="font-semibold text-gray-100">{formatDate(meta.nextResetDate)}</span>
        </p>
      </div>

      {status && (
        <div className="rounded-lg border border-sky-700 bg-sky-950/40 px-4 py-2 text-sm text-sky-300">{status}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleInitializeNewDraft}
          disabled={busy}
          className="min-h-[48px] rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Initialize New Draft
        </button>
        <button
          onClick={handleResetWeek}
          disabled={busy || meta.activeWeek == null}
          className="min-h-[48px] rounded-md bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset This Week's Draft
        </button>
        {confirmingClearHistory ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-red-300">Delete all history? This can't be undone.</span>
            <button
              onClick={handleClearHistory}
              disabled={busy}
              className="min-h-[48px] rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-500"
            >
              Yes, clear it
            </button>
            <button
              onClick={() => setConfirmingClearHistory(false)}
              disabled={busy}
              className="min-h-[48px] rounded-md border border-gray-700 px-4 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleClearHistory}
            disabled={busy}
            className="min-h-[48px] rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear All History
          </button>
        )}
        {confirmingResetSeason ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-red-300">
              Wipe every draft, roster, and history entry and start over at Week 1? This can't be undone.
            </span>
            <button
              onClick={handleResetSeason}
              disabled={busy}
              className="min-h-[48px] rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-600"
            >
              Yes, reset the season
            </button>
            <button
              onClick={() => setConfirmingResetSeason(false)}
              disabled={busy}
              className="min-h-[48px] rounded-md border border-gray-700 px-4 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleResetSeason}
            disabled={busy}
            className="min-h-[48px] rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset Entire Season
          </button>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">Firebase data (read-only)</h3>
          <button
            onClick={() => refresh()}
            className="min-h-[44px] rounded-md border border-gray-700 px-3 text-xs text-gray-300 hover:bg-gray-800"
          >
            Refresh
          </button>
        </div>
        <pre className="max-h-96 overflow-auto rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-400">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </div>
    </div>
  )
}

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
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'

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
      <h2 className="mb-4 text-center text-h3 text-white">Admin login</h2>
      <Card padding="p-6" hoverGlow={false}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>
      </Card>
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
        <h2 className="text-h3 text-white">Admin</h2>
        <Button variant="outline" compact onClick={logout}>
          Log out
        </Button>
      </div>

      <Card padding="p-4" hoverGlow={false} className="text-sm text-slate-300">
        <p>
          Active week: <span className="font-semibold text-white">{meta.activeWeek ?? '—'}</span>
        </p>
        <p>
          Next reset: <span className="font-semibold text-white">{formatDate(meta.nextResetDate)}</span>
        </p>
      </Card>

      {status && (
        <div className="rounded-lg border border-sky-700 bg-sky-950/40 px-4 py-2 text-sm text-sky-300">{status}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleInitializeNewDraft} disabled={busy}>
          Initialize New Draft
        </Button>
        <Button variant="warning" onClick={handleResetWeek} disabled={busy || meta.activeWeek == null}>
          Reset This Week's Draft
        </Button>
        {confirmingClearHistory ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-red-300">Delete all history? This can't be undone.</span>
            <Button variant="danger" onClick={handleClearHistory} disabled={busy}>
              Yes, clear it
            </Button>
            <Button variant="outline" onClick={() => setConfirmingClearHistory(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={handleClearHistory} disabled={busy}>
            Clear All History
          </Button>
        )}
        {confirmingResetSeason ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-red-300">
              Wipe every draft, roster, and history entry and start over at Week 1? This can't be undone.
            </span>
            <Button variant="danger" onClick={handleResetSeason} disabled={busy}>
              Yes, reset the season
            </Button>
            <Button variant="outline" onClick={() => setConfirmingResetSeason(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={handleResetSeason} disabled={busy}>
            Reset Entire Season
          </Button>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Firebase data (read-only)</h3>
          <Button variant="outline" compact onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <pre className="max-h-96 overflow-auto rounded-lg border-2 border-slate-700 bg-slate-800 p-3 text-xs text-slate-400">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </div>
    </div>
  )
}

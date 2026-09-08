import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/draft" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await login(password)
    setSubmitting(false)
    if (result.user) {
      navigate('/draft', { replace: true })
    } else {
      setError(result.error ?? 'Incorrect password.')
      setPassword('')
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-100">Zonk vs Brakke</h1>
      <p className="mb-6 text-sm text-gray-500">1v1 Weekly Fantasy Draft</p>
      <form onSubmit={handleSubmit} className="w-full space-y-3">
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
          disabled={submitting}
          className="min-h-[48px] w-full rounded-md bg-sky-600 px-3 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'

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
      <h1 className="mb-1 text-h1 text-white">Zonk vs Brakke</h1>
      <p className="mb-6 text-sm text-slate-400">1v1 Weekly Fantasy Draft</p>
      <Card className="w-full" padding="p-6" hoverGlow={false}>
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
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

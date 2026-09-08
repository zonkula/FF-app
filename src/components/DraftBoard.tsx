import type { Player } from '../types/player'
import { useDraft } from '../hooks/useDraft'
import { TurnIndicator } from './TurnIndicator'
import { RosterPreview } from './RosterPreview'
import { PlayerPool } from './PlayerPool'

function formatResetTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function DraftBoard() {
  const {
    availablePlayers,
    playerOneRoster,
    playerTwoRoster,
    currentTurn,
    error,
    weekNumber,
    nextResetAt,
    isDraftComplete,
    selectPlayer,
    clearError,
  } = useDraft()

  const handleDraft = (playerId: string) => selectPlayer(playerId, currentTurn)

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-col gap-1 text-xs text-gray-400 sm:flex-row sm:justify-between">
        <span>Week {weekNumber}</span>
        <span>Next reset: {formatResetTime(nextResetAt)}</span>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          <span>{error}</span>
          <button onClick={clearError} className="ml-3 text-red-400 hover:text-red-200" aria-label="Dismiss error">
            ✕
          </button>
        </div>
      )}

      {isDraftComplete ? (
        <DraftCompleteSummary playerOneRoster={playerOneRoster} playerTwoRoster={playerTwoRoster} />
      ) : (
        <>
          <TurnIndicator currentTurn={currentTurn} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RosterPreview label="Player 1" roster={playerOneRoster} isActive={currentTurn === 1} />
            <RosterPreview label="Player 2" roster={playerTwoRoster} isActive={currentTurn === 2} />
          </div>

          <PlayerPool players={availablePlayers} onDraft={handleDraft} />
        </>
      )}
    </div>
  )
}

interface DraftCompleteSummaryProps {
  playerOneRoster: Player[]
  playerTwoRoster: Player[]
}

function DraftCompleteSummary({ playerOneRoster, playerTwoRoster }: DraftCompleteSummaryProps) {
  const p1Total = playerOneRoster.reduce((sum, p) => sum + p.pprPoints, 0)
  const p2Total = playerTwoRoster.reduce((sum, p) => sum + p.pprPoints, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-500 bg-emerald-950/30 px-4 py-3 text-center">
        <p className="font-semibold text-emerald-400">Draft complete! Rosters are locked in for this week.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RosterPreview
          label={`Player 1 · ${p1Total.toFixed(0)} pts`}
          roster={playerOneRoster}
          isActive={false}
          badge={p1Total > p2Total ? 'Leading' : undefined}
        />
        <RosterPreview
          label={`Player 2 · ${p2Total.toFixed(0)} pts`}
          roster={playerTwoRoster}
          isActive={false}
          badge={p2Total > p1Total ? 'Leading' : undefined}
        />
      </div>
    </div>
  )
}

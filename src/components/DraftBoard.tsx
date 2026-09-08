import { useEffect, useRef } from 'react'
import type { Player } from '../types/player'
import { useDraft } from '../hooks/useDraft'
import { useWeeklyScores } from '../hooks/useWeeklyScores'
import { canDraftPosition } from '../context/rosterRules'
import { saveDraftHistory } from '../utils/firebase'
import { TurnIndicator } from './TurnIndicator'
import { RosterPreview } from './RosterPreview'
import { PlayerPool } from './PlayerPool'

export interface DraftBoardProps {
  season: string | null
  week: number | null
}

function formatResetTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function DraftBoard({ season, week }: DraftBoardProps) {
  const {
    availablePlayers,
    playerOneRoster,
    playerTwoRoster,
    currentTurn,
    error,
    weekId,
    weekNumber,
    nextResetAt,
    isDraftComplete,
    isConnected,
    connectionError,
    selectPlayer,
    clearError,
  } = useDraft()

  const handleDraft = (playerId: string) => selectPlayer(playerId, currentTurn)
  const currentRoster = currentTurn === 1 ? playerOneRoster : playerTwoRoster

  if (connectionError) {
    return (
      <p className="mx-auto max-w-md p-8 text-center text-sm text-red-400">
        Couldn't connect to Firebase: {connectionError}
      </p>
    )
  }

  if (!isConnected) {
    return <p className="p-8 text-center text-sm text-gray-400">Connecting to this week's draft...</p>
  }

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
        <DraftCompleteSummary
          weekId={weekId}
          weekNumber={weekNumber}
          season={season}
          week={week}
          playerOneRoster={playerOneRoster}
          playerTwoRoster={playerTwoRoster}
        />
      ) : (
        <>
          <TurnIndicator currentTurn={currentTurn} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RosterPreview label="Player 1" roster={playerOneRoster} isActive={currentTurn === 1} />
            <RosterPreview label="Player 2" roster={playerTwoRoster} isActive={currentTurn === 2} />
          </div>

          <PlayerPool
            players={availablePlayers}
            onDraft={handleDraft}
            canDraft={(position) => canDraftPosition(currentRoster, position)}
          />
        </>
      )}
    </div>
  )
}

interface DraftCompleteSummaryProps {
  weekId: string
  weekNumber: number
  season: string | null
  week: number | null
  playerOneRoster: Player[]
  playerTwoRoster: Player[]
}

function DraftCompleteSummary({
  weekId,
  weekNumber,
  season,
  week,
  playerOneRoster,
  playerTwoRoster,
}: DraftCompleteSummaryProps) {
  const { scores, loading: scoresLoading } = useWeeklyScores(season, week)
  const gamesReported = Object.keys(scores).length > 0

  const p1Total = playerOneRoster.reduce((sum, p) => sum + (scores[p.id] ?? 0), 0)
  const p2Total = playerTwoRoster.reduce((sum, p) => sum + (scores[p.id] ?? 0), 0)

  const historySavedFor = useRef<string | null>(null)
  useEffect(() => {
    if (scoresLoading || historySavedFor.current === weekId) return
    historySavedFor.current = weekId
    saveDraftHistory(weekId, {
      weekId,
      weekNumber,
      playerOneRoster,
      playerTwoRoster,
      playerOneScore: p1Total,
      playerTwoScore: p2Total,
      completedAt: Date.now(),
    }).catch(() => {})
    // Intentionally only re-runs when the completed week changes, not on every score refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId, scoresLoading])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-500 bg-emerald-950/30 px-4 py-3 text-center">
        <p className="font-semibold text-emerald-400">Draft complete! Rosters are locked in for this week.</p>
        {!gamesReported && (
          <p className="mt-1 text-xs text-emerald-400/70">
            Scores will fill in once this week's games are played and Sleeper reports stats.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RosterPreview
          label={`Player 1 · ${p1Total.toFixed(0)} pts`}
          roster={playerOneRoster}
          isActive={false}
          badge={gamesReported && p1Total > p2Total ? 'Leading' : undefined}
        />
        <RosterPreview
          label={`Player 2 · ${p2Total.toFixed(0)} pts`}
          roster={playerTwoRoster}
          isActive={false}
          badge={gamesReported && p2Total > p1Total ? 'Leading' : undefined}
        />
      </div>
    </div>
  )
}

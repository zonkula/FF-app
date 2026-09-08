import { useEffect, useRef } from 'react'
import type { Player } from '../types/player'
import { useDraft } from '../hooks/useDraft'
import { useWeeklyScores } from '../hooks/useWeeklyScores'
import { useSeasonRecord } from '../hooks/useSeasonRecord'
import { usePlayers } from '../context/PlayersContext'
import { canDraftPosition } from '../context/rosterRules'
import { saveDraftHistory, type PlayerHistoryLine } from '../utils/firebase'
import { PLAYER_DISPLAY_NAMES } from '../utils/playerNames'
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
    isConnected,
    connectionError,
    selectPlayer,
    clearError,
  } = useDraft()

  const seasonRecord = useSeasonRecord()

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
        <span>
          Season record: {PLAYER_DISPLAY_NAMES.player1} {seasonRecord.player1.wins}-{seasonRecord.player1.losses}
          {seasonRecord.player1.ties > 0 ? `-${seasonRecord.player1.ties}` : ''} · {PLAYER_DISPLAY_NAMES.player2}{' '}
          {seasonRecord.player2.wins}-{seasonRecord.player2.losses}
          {seasonRecord.player2.ties > 0 ? `-${seasonRecord.player2.ties}` : ''}
        </span>
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
          weekNumber={weekNumber}
          playerOneRoster={playerOneRoster}
          playerTwoRoster={playerTwoRoster}
        />
      ) : (
        <>
          <TurnIndicator currentTurn={currentTurn} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RosterPreview label={PLAYER_DISPLAY_NAMES.player1} roster={playerOneRoster} isActive={currentTurn === 1} />
            <RosterPreview label={PLAYER_DISPLAY_NAMES.player2} roster={playerTwoRoster} isActive={currentTurn === 2} />
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
  weekNumber: number
  playerOneRoster: Player[]
  playerTwoRoster: Player[]
}

function toHistoryLines(roster: Player[], scores: Record<string, number>): PlayerHistoryLine[] {
  return roster.map((player) => ({
    playerId: player.id,
    name: player.name,
    position: player.position,
    points: scores[player.id] ?? 0,
  }))
}

function DraftCompleteSummary({ weekNumber, playerOneRoster, playerTwoRoster }: DraftCompleteSummaryProps) {
  const { week } = usePlayers()
  // Both calls share one Sleeper request (see useWeeklyScores' dedup cache) since they're for
  // the same NFL week - only the roster used to sum totalPoints differs.
  const { scores, totalPoints: p1Total, loading: scoresLoading } = useWeeklyScores(week, playerOneRoster)
  const { totalPoints: p2Total } = useWeeklyScores(week, playerTwoRoster)
  const gamesReported = Object.keys(scores).length > 0

  const historySavedForWeek = useRef<number | null>(null)
  useEffect(() => {
    if (scoresLoading || historySavedForWeek.current === weekNumber) return
    historySavedForWeek.current = weekNumber
    saveDraftHistory(weekNumber, {
      week: weekNumber,
      player1Score: p1Total,
      player2Score: p2Total,
      winner: p1Total === p2Total ? 'tie' : p1Total > p2Total ? 'player1' : 'player2',
      player1Roster: toHistoryLines(playerOneRoster, scores),
      player2Roster: toHistoryLines(playerTwoRoster, scores),
      completedAt: Date.now(),
    }).catch(() => {})
    // Intentionally only re-runs when the completed week changes, not on every score refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekNumber, scoresLoading])

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
          label={`${PLAYER_DISPLAY_NAMES.player1} · ${p1Total.toFixed(0)} pts`}
          roster={playerOneRoster}
          isActive={false}
          badge={gamesReported && p1Total > p2Total ? 'Leading' : undefined}
        />
        <RosterPreview
          label={`${PLAYER_DISPLAY_NAMES.player2} · ${p2Total.toFixed(0)} pts`}
          roster={playerTwoRoster}
          isActive={false}
          badge={gamesReported && p2Total > p1Total ? 'Leading' : undefined}
        />
      </div>
    </div>
  )
}

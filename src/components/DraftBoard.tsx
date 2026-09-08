import { useDraft } from '../hooks/useDraft'
import { TurnIndicator } from './TurnIndicator'
import { RosterPreview } from './RosterPreview'
import { PlayerPool } from './PlayerPool'

export function DraftBoard() {
  const { availablePlayers, playerOneRoster, playerTwoRoster, currentTurn, selectPlayer } = useDraft()
  const isDraftComplete = availablePlayers.length === 0

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <TurnIndicator currentTurn={currentTurn} isDraftComplete={isDraftComplete} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RosterPreview label="Player 1" roster={playerOneRoster} isActive={currentTurn === 1 && !isDraftComplete} />
        <RosterPreview label="Player 2" roster={playerTwoRoster} isActive={currentTurn === 2 && !isDraftComplete} />
      </div>

      <PlayerPool players={availablePlayers} onDraft={selectPlayer} />
    </div>
  )
}

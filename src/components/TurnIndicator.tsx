import type { Turn } from '../context/DraftContext'

export interface TurnIndicatorProps {
  currentTurn: Turn
  isDraftComplete: boolean
}

export function TurnIndicator({ currentTurn, isDraftComplete }: TurnIndicatorProps) {
  if (isDraftComplete) {
    return (
      <div className="rounded-lg bg-emerald-600/20 border border-emerald-500 px-4 py-2 text-center">
        <span className="font-semibold text-emerald-400">Draft complete!</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-center">
      <span className="text-gray-400">On the clock: </span>
      <span className={`font-semibold ${currentTurn === 1 ? 'text-sky-400' : 'text-amber-400'}`}>
        Player {currentTurn}
      </span>
    </div>
  )
}

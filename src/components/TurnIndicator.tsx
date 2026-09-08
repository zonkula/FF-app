import type { Turn } from '../context/DraftContext'

export interface TurnIndicatorProps {
  currentTurn: Turn
}

export function TurnIndicator({ currentTurn }: TurnIndicatorProps) {
  return (
    <div className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-center">
      <span className="text-gray-400">On the clock: </span>
      <span className={`font-semibold ${currentTurn === 1 ? 'text-sky-400' : 'text-amber-400'}`}>
        Player {currentTurn}
      </span>
    </div>
  )
}

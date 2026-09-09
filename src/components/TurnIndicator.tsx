import type { Turn } from '../context/DraftContext'
import { displayNameForTurn } from '../utils/playerNames'

export interface TurnIndicatorProps {
  currentTurn: Turn
}

export function TurnIndicator({ currentTurn }: TurnIndicatorProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-center">
      <span className="text-slate-400">On the clock: </span>
      <span
        className={`animate-pulse font-bold ${currentTurn === 1 ? 'text-sky-500' : 'text-amber-500'}`}
      >
        {displayNameForTurn(currentTurn)}
      </span>
    </div>
  )
}

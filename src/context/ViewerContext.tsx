import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Turn } from './DraftContext'

const STORAGE_KEY = 'ff-app:viewer-turn'

function readStoredViewer(): Turn {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '2' ? 2 : 1
  } catch {
    return 1
  }
}

function writeStoredViewer(turn: Turn): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(turn))
  } catch {
    // sessionStorage unavailable (e.g. private browsing) - the choice just won't persist.
  }
}

export interface ViewerContextValue {
  /** Which side of the shared league this browser is currently acting/viewing as. */
  viewer: Turn
  setViewer: (turn: Turn) => void
}

const ViewerContext = createContext<ViewerContextValue | undefined>(undefined)

/**
 * There's no real per-user login here - Zonk and KBrakke share one app. This just remembers
 * which side *this browser* is currently acting as, so the Roster and Waiver pages agree with
 * each other without asking again on every page.
 */
export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewerState] = useState<Turn>(readStoredViewer)

  const setViewer = useCallback((turn: Turn) => {
    writeStoredViewer(turn)
    setViewerState(turn)
  }, [])

  const value = useMemo<ViewerContextValue>(() => ({ viewer, setViewer }), [viewer, setViewer])
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
}

export function useViewer(): ViewerContextValue {
  const context = useContext(ViewerContext)
  if (!context) {
    throw new Error('useViewer must be used within a ViewerProvider')
  }
  return context
}

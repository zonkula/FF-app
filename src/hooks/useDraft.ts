import { useContext } from 'react'
import { DraftContext } from '../context/DraftContext'

/** Access draft state and actions. Must be called within a DraftProvider. */
export function useDraft() {
  const context = useContext(DraftContext)
  if (!context) {
    throw new Error('useDraft must be used within a DraftProvider')
  }
  return context
}

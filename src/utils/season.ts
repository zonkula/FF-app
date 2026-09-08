const ONE_DAY_MS = 24 * 60 * 60 * 1000
export const ONE_WEEK_MS = 7 * ONE_DAY_MS

/** Draft weeks roll over every Tuesday at midnight (the day after Monday Night Football). */
const RESET_DAY = 2 // Date#getDay(): 0=Sun, 1=Mon, 2=Tue, ...

/** The next Tuesday-at-midnight strictly after `from`. */
export function getNextWeeklyResetDate(from: Date = new Date()): Date {
  const candidate = new Date(from)
  candidate.setHours(0, 0, 0, 0)
  while (candidate.getDay() !== RESET_DAY || candidate.getTime() <= from.getTime()) {
    candidate.setDate(candidate.getDate() + 1)
  }
  return candidate
}

/** The most recent Tuesday-at-midnight at or before `from` — the start of the current draft week. */
export function getCurrentWeekStart(from: Date = new Date()): Date {
  return new Date(getNextWeeklyResetDate(from).getTime() - ONE_WEEK_MS)
}

/** Stable id for the draft week containing `from`, e.g. "2026-09-08". */
export function getWeekId(from: Date = new Date()): string {
  return getCurrentWeekStart(from).toISOString().slice(0, 10)
}

/** How many weekly boundaries separate two week ids (always >= 0). */
export function weeksBetween(fromWeekId: string, toWeekId: string): number {
  const diff = new Date(toWeekId).getTime() - new Date(fromWeekId).getTime()
  return Math.max(0, Math.round(diff / ONE_WEEK_MS))
}

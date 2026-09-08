import { describe, expect, it } from 'vitest'
import { getCurrentWeekStart, getNextWeeklyResetDate, getWeekId, weeksBetween } from './season'

describe('getNextWeeklyResetDate', () => {
  it('returns Tuesday midnight when called on a Monday', () => {
    const monday = new Date('2026-09-07T15:00:00')
    const next = getNextWeeklyResetDate(monday)
    expect(next.toISOString().slice(0, 10)).toBe('2026-09-08')
    expect(next.getHours()).toBe(0)
    expect(next.getMinutes()).toBe(0)
  })

  it('rolls over a full week when called after Tuesday midnight has already passed', () => {
    const tuesdayAfternoon = new Date('2026-09-08T12:00:00')
    const next = getNextWeeklyResetDate(tuesdayAfternoon)
    expect(next.toISOString().slice(0, 10)).toBe('2026-09-15')
  })

  it('rolls over a full week when called exactly at the boundary', () => {
    const tuesdayMidnight = new Date('2026-09-08T00:00:00')
    const next = getNextWeeklyResetDate(tuesdayMidnight)
    expect(next.toISOString().slice(0, 10)).toBe('2026-09-15')
  })
})

describe('getCurrentWeekStart / getWeekId', () => {
  it('anchors a mid-week date to the preceding Tuesday', () => {
    const thursday = new Date('2026-09-10T09:00:00')
    expect(getWeekId(thursday)).toBe('2026-09-08')
    expect(getCurrentWeekStart(thursday).getHours()).toBe(0)
  })

  it('treats Tuesday itself as the start of its own week', () => {
    const tuesdayMorning = new Date('2026-09-08T06:00:00')
    expect(getWeekId(tuesdayMorning)).toBe('2026-09-08')
  })
})

describe('weeksBetween', () => {
  it('counts whole weeks crossed between two week ids', () => {
    expect(weeksBetween('2026-09-08', '2026-09-15')).toBe(1)
    expect(weeksBetween('2026-09-08', '2026-09-29')).toBe(3)
    expect(weeksBetween('2026-09-08', '2026-09-08')).toBe(0)
  })
})

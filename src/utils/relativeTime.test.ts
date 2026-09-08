import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './relativeTime'

const NOW = 1_000_000_000

describe('formatRelativeTime', () => {
  it('shows "just now" for anything under a minute', () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe('just now')
    expect(formatRelativeTime(NOW, NOW)).toBe('just now')
  })

  it('shows singular vs plural minutes correctly', () => {
    expect(formatRelativeTime(NOW - 60_000, NOW)).toBe('1 minute ago')
    expect(formatRelativeTime(NOW - 5 * 60_000, NOW)).toBe('5 minutes ago')
  })

  it('rolls over to hours past 60 minutes', () => {
    expect(formatRelativeTime(NOW - 90 * 60_000, NOW)).toBe('2 hours ago')
    expect(formatRelativeTime(NOW - 60 * 60_000, NOW)).toBe('1 hour ago')
  })

  it('rolls over to days past 24 hours', () => {
    expect(formatRelativeTime(NOW - 25 * 60 * 60_000, NOW)).toBe('1 day ago')
    expect(formatRelativeTime(NOW - 3 * 24 * 60 * 60_000, NOW)).toBe('3 days ago')
  })

  it('never returns a negative duration for a timestamp slightly in the future (clock skew)', () => {
    expect(formatRelativeTime(NOW + 5_000, NOW)).toBe('just now')
  })
})

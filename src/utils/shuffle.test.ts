import { describe, expect, it } from 'vitest'
import { seededShuffle } from './shuffle'

describe('seededShuffle', () => {
  it('returns a permutation of the input', () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    const shuffled = seededShuffle(items, 'week-1')
    expect(shuffled).toHaveLength(items.length)
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items)
  })

  it('is deterministic for the same seed', () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    expect(seededShuffle(items, 'week-1')).toEqual(seededShuffle(items, 'week-1'))
  })

  it('produces a different order for a different seed', () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    expect(seededShuffle(items, 'week-1')).not.toEqual(seededShuffle(items, 'week-2'))
  })
})

import { describe, expect, test } from '@jest/globals'
import { buildEventMomentum, calculatePressure, toNumber } from './momentum'

describe('match momentum', () => {
  test('turns scored goals and red cards into an ordered event curve', () => {
    const points = buildEventMomentum([
      { minute: 70, type: 'red_card', detail: 'Red Card', team: 'home' },
      { minute: 12, type: 'goal', detail: 'Normal Goal', team: 'home' },
    ], 82)

    expect(points).toEqual([
      { minute: 0, value: 0 },
      { minute: 12, value: 42 },
      { minute: 70, value: 12 },
      { minute: 82, value: 12 },
    ])
  })

  test('calculates a neutral pressure score with no usable live statistics', () => {
    expect(calculatePressure(
      { possession: null, shotsOn: null, shotsTotal: null, corners: null },
      { possession: null, shotsOn: null, shotsTotal: null, corners: null },
    )).toEqual({ home: 50, away: 50, available: false })
    expect(toNumber('61%')).toBe(61)
  })
})

import { describe, expect, test } from '@jest/globals'
import { performanceFixtureId } from './performance'

describe('performance settlement id', () => {
  test('is deterministic and unique per market without colliding with positive fixture ids', () => {
    expect(performanceFixtureId('123456', 'btts')).toBe(-1234566)
    expect(performanceFixtureId('123456', 'over25')).toBe(-1234565)
  })

  test('rejects non-numeric provider ids before writing performance', () => {
    expect(() => performanceFixtureId('../123', 'btts')).toThrow('Invalid fixture id')
  })
})

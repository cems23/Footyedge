import { describe, expect, test } from '@jest/globals'
import { isRadarCompetition, RADAR_COMPETITIONS } from './radarCompetitions'

describe('radar competition catalogue', () => {
  test('includes the three UEFA club competitions and the existing value leagues', () => {
    expect(isRadarCompetition(2)).toBe(true)
    expect(isRadarCompetition(3)).toBe(true)
    expect(isRadarCompetition(848)).toBe(true)
    expect(isRadarCompetition(40)).toBe(true)
    expect(isRadarCompetition(106)).toBe(true)
    expect(RADAR_COMPETITIONS.length).toBeGreaterThan(40)
  })
})

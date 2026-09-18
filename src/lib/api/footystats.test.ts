import { describe, expect, test } from '@jest/globals'
import { extractFootyStatsData, findFootyStatsMatch } from './footystats'
import type { FootyStatsMatch } from './footystats'

const matches: FootyStatsMatch[] = [
  {
    id: 1,
    homeID: 10,
    awayID: 20,
    home_name: 'Paris Saint-Germain',
    away_name: 'West Bromwich Albion',
    date_unix: 0,
    status: 'scheduled',
    odds_ft_1: 1.8,
    odds_btts_yes: 1.9,
  },
]

describe('FootyStats normalization', () => {
  test('matches known aliases without weakening the away-team check', () => {
    expect(findFootyStatsMatch(matches, 'PSG', 'West Brom')).toMatchObject({ id: 1 })
    expect(findFootyStatsMatch(matches, 'PSG', 'Manchester United')).toBeNull()
  })

  test('extracts only available prematch fields', () => {
    expect(extractFootyStatsData(matches[0])).toEqual(expect.objectContaining({
      oddsHome: 1.8,
      oddsBtts: 1.9,
      oddsAway: undefined,
    }))
  })
})

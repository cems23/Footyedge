import { describe, expect, test } from '@jest/globals'
import { analyzeMatch, calcLambdas, prob1X2 } from './poisson'
import type { MatchInput } from './poisson'

const baseInput: MatchInput = {
  home: {
    goalsScored: 18,
    goalsConceded: 10,
    matchesPlayed: 10,
    recentGoalsScored: [1, 2, 1, 3, 2],
    recentGoalsConceded: [1, 0, 1, 1, 0],
    isHome: true,
  },
  away: {
    goalsScored: 12,
    goalsConceded: 16,
    matchesPlayed: 10,
    recentGoalsScored: [1, 1, 2, 0, 1],
    recentGoalsConceded: [2, 1, 1, 2, 1],
    isHome: false,
  },
  league: { avgHomeGoals: 1.5, avgAwayGoals: 1.2, avgTotalGoals: 2.7 },
  leagueId: 39,
}

describe('Poisson model invariants', () => {
  test('1X2 probabilities are bounded and sum to one', () => {
    const probabilities = prob1X2(1.6, 1.1)

    expect(probabilities.home).toBeGreaterThanOrEqual(0)
    expect(probabilities.draw).toBeGreaterThanOrEqual(0)
    expect(probabilities.away).toBeGreaterThanOrEqual(0)
    expect(probabilities.home + probabilities.draw + probabilities.away).toBeCloseTo(1, 10)
  })

  test('does not publish a value bet with fewer than three matches of data', () => {
    const analysis = analyzeMatch({
      ...baseInput,
      home: { ...baseInput.home, matchesPlayed: 2 },
      away: { ...baseInput.away, matchesPlayed: 2 },
      oddsHome: 2.8,
      oddsOver25: 2.5,
      oddsBtts: 2.4,
    })

    expect(analysis.valueBets).toEqual([])
  })

  test('flags and caps distorted raw lambdas before they can become picks', () => {
    const lambdas = calcLambdas({
      ...baseInput,
      home: { ...baseInput.home, goalsScored: 100, matchesPlayed: 10 },
      away: { ...baseInput.away, goalsConceded: 100, matchesPlayed: 10 },
    })

    expect(lambdas.rawLambdaHome).toBeGreaterThan(3.5)
    expect(lambdas.lambdaHome).toBe(3.5)
    expect(lambdas.lambdaHomeCapped).toBe(true)
  })
})

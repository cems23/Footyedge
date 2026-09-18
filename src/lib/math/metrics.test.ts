import { describe, expect, test } from '@jest/globals'
import { calcKelly, calcPerformance, calcRankScore, getTop5 } from './metrics'
import type { Pick, RankedBet } from './metrics'

function pick(overrides: Partial<Pick>): Pick {
  return {
    id: 'pick-1',
    matchId: 'match-1',
    market: 'btts',
    odds: 2,
    stake: 1,
    modelProb: 0.55,
    ev: 0.1,
    edge: 0.05,
    confidence: 60,
    result: 'pending',
    profit: 0,
    createdAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('performance metrics', () => {
  test('excludes pending and void picks from settled performance', () => {
    const metrics = calcPerformance([
      pick({ id: 'win', result: 'win', profit: 1 }),
      pick({ id: 'loss', result: 'loss', profit: -1, createdAt: '2026-09-02T12:00:00.000Z' }),
      pick({ id: 'pending', result: 'pending', profit: 0 }),
      pick({ id: 'void', result: 'void', profit: 0 }),
    ])

    expect(metrics.totalBets).toBe(4)
    expect(metrics.settledBets).toBe(2)
    expect(metrics.wins).toBe(1)
    expect(metrics.winRate).toBe(50)
    expect(metrics.roi).toBe(0)
    expect(metrics.equityCurve).toHaveLength(2)
  })

  test('Kelly rejects invalid inputs and keeps a positive value bet positive', () => {
    expect(calcKelly(0.5, 1)).toBe(0)
    expect(calcKelly(0, 2)).toBe(0)
    expect(calcKelly(0.6, 2)).toBeCloseTo(0.05, 10)
  })

  test('top rankings are ordered by rank score without mutating the input', () => {
    const bets: RankedBet[] = [
      { matchId: 'a', matchLabel: 'A', leagueName: 'L', kickoffAt: '2026-09-01', market: 'btts', marketLabel: 'BTTS', odds: 2, ev: 0.1, edge: 0.1, confidence: 50, kellyStake: 0.1, rankScore: calcRankScore(0.1, 0.1, 50) },
      { matchId: 'b', matchLabel: 'B', leagueName: 'L', kickoffAt: '2026-09-01', market: 'btts', marketLabel: 'BTTS', odds: 2, ev: 0.2, edge: 0.2, confidence: 70, kellyStake: 0.1, rankScore: calcRankScore(0.2, 0.2, 70) },
    ]

    expect(getTop5(bets).map(b => b.matchId)).toEqual(['b', 'a'])
    expect(bets.map(b => b.matchId)).toEqual(['a', 'b'])
  })
})

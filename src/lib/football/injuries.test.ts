import { describe, expect, test } from '@jest/globals'
import { summarizeTeamInjuries } from './injuries'

describe('injury watch normalization', () => {
  test('counts only confirmed injuries and keeps doubts and suspensions as context', () => {
    const summary = summarizeTeamInjuries([
      { team: { id: 1 }, player: { id: 10, name: 'A', type: 'Missing Fixture', reason: 'Muscle Injury' } },
      { team: { id: 1 }, player: { id: 11, name: 'B', type: 'Questionable', reason: 'Knee Injury' } },
      { team: { id: 1 }, player: { id: 12, name: 'C', type: 'Missing Fixture', reason: 'Suspended' } },
      { team: { id: 1 }, player: { id: 10, name: 'A', type: 'Missing Fixture', reason: 'Muscle Injury' } },
      { team: { id: 2 }, player: { id: 13, name: 'Other', reason: 'Ankle Injury' } },
    ], 1)

    expect(summary.confirmed.map((player) => player.name)).toEqual(['A'])
    expect(summary.questionable.map((player) => player.name)).toEqual(['B'])
    expect(summary.suspensions.map((player) => player.name)).toEqual(['C'])
  })
})

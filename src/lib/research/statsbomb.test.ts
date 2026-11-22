import { describe, expect, test } from '@jest/globals'
import { isSafeStatsBombId, summarizeStatsBombEvents } from './statsbomb'

describe('StatsBomb research summaries', () => {
  test('keeps only aggregate, team-level research metrics', () => {
    const teams = summarizeStatsBombEvents([
      { type: { name: 'Shot' }, team: { name: 'Azul' }, shot: { statsbomb_xg: 0.42, outcome: { name: 'Goal' } } },
      { type: { name: 'Shot' }, team: { name: 'Azul' }, shot: { statsbomb_xg: 0.11, outcome: { name: 'Saved' } } },
      { type: { name: 'Pressure' }, team: { name: 'Rojo' } },
      { type: { name: 'Pass' }, team: { name: 'Rojo' }, pass: {} },
      { type: { name: 'Pass' }, team: { name: 'Rojo' }, pass: { outcome: { name: 'Out' } } },
    ])
    expect(teams).toEqual(expect.arrayContaining([
      expect.objectContaining({ team: 'Azul', shots: 2, shotsOnTarget: 2, goals: 1, xg: 0.53 }),
      expect.objectContaining({ team: 'Rojo', pressures: 1, completedPasses: 1, passAttempts: 2, passCompletion: 50 }),
    ]))
  })

  test('accepts only positive numeric ids for paths', () => {
    expect(isSafeStatsBombId('3788741')).toBe(true)
    expect(isSafeStatsBombId('0')).toBe(false)
    expect(isSafeStatsBombId('../events')).toBe(false)
  })
})

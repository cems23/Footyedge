import { formatApiFootballErrors } from './football'

describe('formatApiFootballErrors', () => {
  it('turns API-Football error envelopes into a concise diagnostic', () => {
    expect(formatApiFootballErrors({ token: 'Invalid API key', error: '4xSe' }))
      .toBe('token: Invalid API key; error: 4xSe')
  })

  it('ignores an empty error object', () => {
    expect(formatApiFootballErrors({})).toBeNull()
  })
})

import { describe, expect, test } from '@jest/globals'
import { isAdminEmail } from './permissions'

describe('admin permission', () => {
  test('allows only configured administrator emails', () => {
    expect(isAdminEmail('carlosmartens8@gmail.com')).toBe(true)
    expect(isAdminEmail('CARLOSMARTENS8@GMAIL.COM')).toBe(true)
    expect(isAdminEmail('member@example.com')).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
  })
})

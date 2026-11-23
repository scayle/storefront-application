import { it, expect, describe } from 'vitest'
import { getDecimalPlacesForCurrency } from './i18n'

describe('getDecimalPlacesForCurrency', () => {
  it.for([
    ['USD', 2],
    ['JOD', 3],
    ['JPY', 0],
  ] as const)(
    'returns the decimal places of %s as %i',
    ([currencyCode, expected]) => {
      expect(getDecimalPlacesForCurrency(currencyCode)).toBe(expected)
    },
  )
})

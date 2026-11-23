import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from './formatter'

describe('formatDate', () => {
  const fixedDate = new Date(2024, 11, 25) // 25 Dec 2024

  it('returns undefined for invalid date', () => {
    expect(formatDate(new Date('invalid'))).toBeUndefined()
  })

  it('uses default locale en-GB when locale is not provided', () => {
    expect(formatDate(fixedDate)).toBe('25/12/2024')
  })

  it.each([
    ['de-DE', '25.12.2024'],
    ['en-US', '12/25/2024'],
  ])('formats the date for %s as %s', (locale, expected) => {
    expect(formatDate(fixedDate, locale)).toBe(expected)
  })
})

describe('formatDateTime', () => {
  const fixedDateTime = new Date(2024, 11, 25, 14, 30)

  it('returns undefined for invalid date', () => {
    expect(formatDateTime(new Date('invalid'))).toBeUndefined()
  })

  it('uses default locale en-GB when locale is not provided', () => {
    expect(formatDateTime(fixedDateTime)).toBe('25/12/2024, 14:30')
  })

  it.each([
    ['de-DE', '25.12.2024, 14:30'],
    ['en-US', '12/25/2024, 2:30 PM'],
  ])('formats the date and time for %s as %s', (locale, expected) => {
    // Node's bundled ICU version decides whether the en-US AM/PM separator is
    // a regular space or a narrow no-break space; normalize before comparing
    // so the assertion doesn't depend on the Node version running the test.
    const normalized = formatDateTime(fixedDateTime, locale)?.replace(
      /\u202F/g,
      ' ',
    )
    expect(normalized).toBe(expected)
  })
})

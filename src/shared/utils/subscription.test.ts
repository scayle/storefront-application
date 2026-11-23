import { describe, it, expect } from 'vitest'
import { createI18nInstance } from '../../i18n/config'
import { getLocaleMessages } from '../../i18n/messagesServer'
import { formatDeliveryDay } from './subscription'

const createLocaleI18n = (locale: string) =>
  createI18nInstance(locale, { [locale]: getLocaleMessages(locale) })

describe('formatDeliveryDay', () => {
  const mockT = (key: string): string => {
    const suffixes: Record<string, string> = {
      'subscription.ordinal_suffix.one': 'st',
      'subscription.ordinal_suffix.two': 'nd',
      'subscription.ordinal_suffix.few': 'rd',
      'subscription.ordinal_suffix.other': 'th',
    }
    return suffixes[key] ?? key
  }

  it.for([
    [1, '1st'],
    [7, '7th'],
    [15, '15th'],
    [31, '31st'],
  ] as const)('formats day %i as %s', ([day, expected]) => {
    expect(formatDeliveryDay(day, 'en-GB', mockT)).toBe(expected)
  })

  it.for([0, 32, 1.5, Number.NaN, undefined])(
    'returns undefined for day %s, which is not a day of the month',
    (day) => {
      expect(formatDeliveryDay(day, 'en-GB', mockT)).toBeUndefined()
    },
  )
})

describe('formatDeliveryDay with the real i18n instance', () => {
  const { t } = createLocaleI18n('en-GB').global

  it.for([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [31, '31st'],
  ] as const)('formats day %i as %s', ([day, expected]) => {
    expect(formatDeliveryDay(day, 'en-GB', t)).toBe(expected)
  })
})

describe('formatDeliveryDay across locales', () => {
  it.for([
    ['en-US', 3, '3rd'],
    ['de-DE', 3, '3.'],
  ] as const)('formats %s day %i as %s', ([locale, day, expected]) => {
    const { t } = createLocaleI18n(locale).global
    expect(formatDeliveryDay(day, locale, t)).toBe(expected)
  })
})

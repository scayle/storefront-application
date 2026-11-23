import { describe, expect, it } from 'vitest'
import { getLocaleModuleId } from './messagesServer'

describe('getLocaleModuleId', () => {
  it('returns the path of the resolved locale file relative to the Vite root', () => {
    // The SSR manifest keys modules by this form, with no leading slash.
    expect(getLocaleModuleId('de-AT')).toBe('src/i18n/locales/de_AT.json')
  })
})

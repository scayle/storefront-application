import { describe, expect, it, vi } from 'vitest'
import { getPageLocale, resolveLocaleFile } from './config'

const warnMock = vi.hoisted(() => vi.fn())

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({ warn: warnMock }),
}))

/** Locale files keyed by path, the way `import.meta.glob` returns them. */
const filesFor = (...names: string[]): Record<string, string> =>
  Object.fromEntries(names.map((name) => [`/src/i18n/locales/${name}`, name]))

describe('resolveLocaleFile', () => {
  const files = filesFor(
    'en_US.json',
    'de_DE.json',
    'sr_Latn_RS.json',
    'en_GB.json',
  )

  it.for([
    ['the file named after the locale', 'en-US', 'en_US.json'],
    ['a file whose name has a script subtag', 'sr-Latn-RS', 'sr_Latn_RS.json'],
    [
      'the fallback locale file over a same-language one',
      'en-AU',
      'de_DE.json',
    ],
    ['the fallback locale file', 'ja-JP', 'de_DE.json'],
    ['the fallback locale file', 'abcd-ABCD', 'de_DE.json'],
  ] as const)('picks %s for %s', ([, locale, expected]) => {
    expect(resolveLocaleFile(locale, files).file).toBe(expected)
  })

  it('warns once per locale that has no file of its own', () => {
    resolveLocaleFile('pt-BR', files)
    resolveLocaleFile('pt-BR', files)

    expect(warnMock).toHaveBeenCalledOnce()
    expect(warnMock).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'pt-BR' }),
    )
  })

  it('throws when no file serves the locale and none exists for the fallback locale', () => {
    expect(() =>
      resolveLocaleFile('ja-JP', { '/src/i18n/locales/en_GB.json': {} }),
    ).toThrow('No locale file serves "ja-JP"')
  })
})

describe('getPageLocale', () => {
  it.for([
    [
      'the shop locale',
      { storefront: { country: { locale: 'en-US' } }, locale: 'fr-FR' },
      'en-US',
    ],
    ["the Error page's locale prop", { locale: 'fr-FR' }, 'fr-FR'],
    ['the fallback locale', {}, 'de-DE'],
  ] as const)('reads %s', ([, props, expected]) => {
    expect(getPageLocale(props)).toBe(expected)
  })
})

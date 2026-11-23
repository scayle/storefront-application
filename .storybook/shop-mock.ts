import type {
  AvailableCountry,
  AvailableLanguage,
} from '@scayle/storefront/types'

/** Locale of the preview's active shop, which names the countries. */
const activeLocale = 'en-US'

const regionNames = new Intl.DisplayNames([activeLocale], { type: 'region' })

/**
 * Builds a shop row the way `CountryService.toLanguage` does: the language
 * `code` comes from the locale, and the `name` is that language in the shop's
 * own locale, for example "Deutsch" for `de-CH`.
 */
const shop = (locale: string): AvailableLanguage => {
  const { language } = new Intl.Locale(locale)
  return {
    code: language,
    name:
      new Intl.DisplayNames([locale], { type: 'language' }).of(language) ?? '',
    locale,
    url: `https://example.com/${locale.toLowerCase()}`,
  }
}

/**
 * Builds a country row the way `CountryService.getAvailableCountries` does,
 * named in the active shop's locale.
 */
const country = (code: string, languages: AvailableLanguage[]) => ({
  code,
  name: regionNames.of(code) ?? '',
  languages,
})

/** Shop of the preview's active country (`en-US`), the only one for the United States. */
export const unitedStatesShops: AvailableLanguage[] = [shop('en-US')]

/** One shop for Austria, for stories that need a single-language country. */
export const austriaShops: AvailableLanguage[] = [shop('de-AT')]

/** Two shops for Switzerland, for stories that need a choice of language. */
export const switzerlandShops: AvailableLanguage[] = [
  shop('de-CH'),
  shop('fr-CH'),
]

/** Two shops for Germany, a German and an English one. */
export const germanyShops: AvailableLanguage[] = [shop('de-DE'), shop('en-DE')]

/**
 * Countries the preview offers in the shop switcher. `preview.ts` seeds them as
 * the `availableCountries` page prop, with `unitedStatesShops` as
 * `availableLanguages`, so every story that renders `SFShopSwitcher` has other
 * shops to switch to. Like the server, the countries are named in the active
 * shop's locale and sorted by that name, and each shop names its language in
 * its own locale.
 */
export const storybookCountries: AvailableCountry[] = [
  country('US', unitedStatesShops),
  country('DE', germanyShops),
  country('AT', austriaShops),
  country('CH', switzerlandShops),
].sort((a, b) => a.name.localeCompare(b.name, activeLocale))

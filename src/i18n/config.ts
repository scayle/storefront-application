import { createI18n } from 'vue-i18n'
import type { I18n, I18nOptions } from 'vue-i18n'
import type { Components } from '@scayle/storefront'
import { createLogger } from '@scayle/storefront/shared'
import type { PageProps } from '@shared/types/PageProps'
import type en_GB from './locales/en_GB.json'

const log = createLogger('i18n')

/** Locales `resolveLocaleFile` has already warned about. */
const warnedLocales = new Set<string>()

export const fallbackLocale = 'de-DE'

/** Page props `getPageLocale` reads. */
type PageLocaleProps = Partial<Pick<Components['Error'], 'locale'>> & {
  storefront?: { country: Pick<PageProps['storefront']['country'], 'locale'> }
}

/**
 * Reads the active locale from the props of the page being rendered.
 *
 * Both `main.ts` and `ssr.ts` call it, so hydration renders the locale the
 * server rendered.
 *
 * @param props - Page props. Every shared prop is optional, because the
 * bare-bones Error page renders with `excludeSharedProps` and carries the
 * locale as its own `locale` prop instead.
 * @returns The locale of the active shop, else the Error page's `locale` prop,
 * else {@link fallbackLocale}.
 */
export const getPageLocale = (props: PageLocaleProps): string =>
  props.storefront?.country.locale ?? props.locale ?? fallbackLocale

/**
 * Messages of one locale file. Every file carries the keys of `en_GB.json`,
 * where new keys are authored, and ESLint keeps the other files in line.
 */
export type MessageSchema = typeof en_GB

const JSON_EXTENSION = /\.json$/

/**
 * Derives the BCP 47 locale a message file serves from its path.
 *
 * Used to match a shop locale against the files in `src/i18n/locales/`, and by
 * `localeMessages` in `./messagesServer` to key every file by its locale.
 *
 * @param path - Path of a locale file, e.g. `/src/i18n/locales/de_DE.json`.
 * @returns The locale in the file name, e.g. `de-DE`.
 */
export const localeOfFile = (path: string): string =>
  path
    .slice(path.lastIndexOf('/') + 1)
    .replace(JSON_EXTENSION, '')
    .replaceAll('_', '-')

/**
 * Picks the locale file that serves a shop locale.
 *
 * The server bundles every locale file and the browser loads only the one it
 * needs, but both resolve through this function, so hydration always renders
 * the messages the server rendered with.
 *
 * @param locale - BCP 47 locale of the active shop, e.g. `de-AT`.
 * @param files - Locale files keyed by path, as `import.meta.glob` returns them.
 * @returns The path and value of the file named after `locale`, e.g.
 * `de_AT.json` for `de-AT`. Without one, the file for {@link fallbackLocale},
 * and the first such call per locale logs a warning.
 * @throws When no file is named after `locale` and none exists for
 * {@link fallbackLocale}.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/localization/internationalization
 */
export function resolveLocaleFile<T>(
  locale: string,
  files: Record<string, T>,
): { path: string; file: T } {
  const candidates = Object.entries(files).map(([path, file]) => ({
    locale: localeOfFile(path),
    path,
    file,
  }))

  const match = candidates.find((candidate) => candidate.locale === locale)
  if (match) {
    return { path: match.path, file: match.file }
  }

  const fallback = candidates.find(
    (candidate) => candidate.locale === fallbackLocale,
  )
  if (!fallback) {
    throw new Error(
      `No locale file serves "${locale}", and there is none for the fallback locale "${fallbackLocale}" either.`,
    )
  }

  // The server resolves the locale several times per request, so a shop
  // without its own file would log on every page view.
  if (!warnedLocales.has(locale)) {
    warnedLocales.add(locale)
    log.warn({
      message:
        'No locale file is named after the shop locale, so it renders the fallback locale messages',
      locale,
      fallbackLocale,
    })
  }

  return { path: fallback.path, file: fallback.file }
}

const datetimeFormats = {
  'en-US': {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    long: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
    },
  },
  'de-DE': {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    long: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
    },
  },
} as const

const numberFormats = {
  'en-US': {
    currency: {
      style: 'currency',
      currency: 'USD',
    },
    decimal: {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  'de-DE': {
    currency: {
      style: 'currency',
      currency: 'EUR',
    },
    decimal: {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
} as const

/**
 * Creates a Vue I18n instance for the active locale.
 *
 * Used by the browser entry, the SSR entry and `ServerI18nService`, each with
 * the messages it resolved for the active shop, and by Storybook with every
 * locale so its toolbar can switch between them.
 *
 * @param locale - BCP 47 locale of the active shop. It stays the shop locale
 * even when its messages come from another region's file, because
 * `useI18n().locale` follows it, and so does the `Intl` formatting that reads
 * it, such as the `Intl.PluralRules` call in `subscription.ts`.
 * @param messages - Messages keyed by locale. The application passes a map with
 * the single key `locale`, or an empty map in the browser, which registers the
 * messages before mount.
 * @returns The configured instance.
 */
export const createI18nInstance = (
  locale: string,
  messages: Record<string, MessageSchema>,
): I18n => {
  const options: I18nOptions = {
    legacy: false,
    locale,
    // Only the active locale's messages are registered, so this gives `t()` no
    // fallback text: a missing key renders as the key itself. It still lets
    // `d()` and `n()` use the `de-DE` entry of `datetimeFormats` and
    // `numberFormats` for a locale those don't list.
    fallbackLocale,
    messages,
    datetimeFormats,
    numberFormats,
  }

  return createI18n(options)
}

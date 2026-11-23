import { localeOfFile, resolveLocaleFile } from './config'
import type { MessageSchema } from './config'

/**
 * Every locale file, bundled into the importing module.
 *
 * For server code, the SSR entry, Storybook and tests only. The browser entry
 * uses `loadLocaleMessages` from `./messagesBrowser` instead, because importing
 * this module there would put every locale into the entry chunk. ESLint
 * rejects an import of this module from `src/client/` or `src/shared/`.
 *
 * The pattern starts at the Vite root, so the keys are module paths with a
 * leading slash (`/src/i18n/locales/de_DE.json`). The SSR manifest keys the
 * same paths without it, which `getLocaleModuleId` accounts for.
 */
const localeFiles = import.meta.glob<MessageSchema>(
  '/src/i18n/locales/*.json',
  { eager: true, import: 'default' },
)

/**
 * Every locale's messages, keyed by BCP 47 locale (`de-DE`).
 *
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/localization/internationalization
 */
export const localeMessages: Record<string, MessageSchema> = Object.fromEntries(
  Object.entries(localeFiles).map(([path, messages]) => [
    localeOfFile(path),
    messages,
  ]),
)

/**
 * Returns the messages of the locale file that serves a shop locale.
 *
 * Used by the SSR entry and `ServerI18nService`, which both render with the
 * active shop's messages only.
 *
 * @param locale - BCP 47 locale of the active shop, e.g. `de-AT`.
 * @returns The messages of the file `resolveLocaleFile` picks for `locale`.
 */
export const getLocaleMessages = (locale: string): MessageSchema =>
  resolveLocaleFile(locale, localeFiles).file

/**
 * Returns the module path of the locale file that serves a shop locale.
 *
 * The SSR entry reports it in `modules`, next to the components it rendered,
 * so the server sends a `modulepreload` hint for the client chunk carrying
 * the file and `loadLocaleMessages` finds it already fetched.
 *
 * @param locale - BCP 47 locale of the active shop, e.g. `de-AT`.
 * @returns The path relative to the Vite root, with no leading slash, e.g.
 * `src/i18n/locales/de_DE.json`.
 */
export const getLocaleModuleId = (locale: string): string =>
  resolveLocaleFile(locale, localeFiles).path.slice(1)

import { resolveLocaleFile } from './config'
import type { MessageSchema } from './config'

/**
 * Every locale file as a lazy import, so the client build emits one chunk per
 * locale and the entry chunk carries none. Same pattern as `./messagesServer`,
 * so both resolve a shop locale against the same keys.
 */
const localeFiles = import.meta.glob<MessageSchema>(
  '/src/i18n/locales/*.json',
  { import: 'default' },
)

/**
 * Loads the messages of the locale file that serves a shop locale.
 *
 * Used by the browser entry, which mounts only once they have loaded, because
 * hydration has to render the text the server rendered. The SSR entry reports
 * the same file in `modules`, so the page carries a `modulepreload` hint for
 * its chunk and this import rarely waits on the network.
 *
 * @param locale - BCP 47 locale of the active shop, e.g. `de-AT`.
 * @returns The messages of the file `resolveLocaleFile` picks for `locale`.
 * Rejects when the chunk fails to load or no file serves `locale`.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/localization/internationalization
 */
export const loadLocaleMessages = async (
  locale: string,
): Promise<MessageSchema> => resolveLocaleFile(locale, localeFiles).file()

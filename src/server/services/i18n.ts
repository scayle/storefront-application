import type { StorefrontContext } from '@scayle/storefront'
import { createI18nInstance } from '../../i18n/config'
import { getLocaleMessages } from '../../i18n/messagesServer'

export type TranslateFunction = (
  key: string,
  params?: Record<string, unknown>,
) => string

/**
 * Server-side i18n service for use in mappers, services, and other server-side logic
 * This creates a standalone i18n instance that doesn't require a Vue app context
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/localization/internationalization
 */
export class ServerI18nService {
  private readonly i18n

  constructor(storefront: StorefrontContext) {
    const { locale } = storefront.country
    this.i18n = createI18nInstance(locale, {
      [locale]: getLocaleMessages(locale),
    })
  }

  /**
   * Translates a message key
   * @param key - Translation key (e.g., 'product.addToBasket')
   * @param params - Optional parameters for interpolation
   * @returns Translated string
   */
  t(key: string, params?: Record<string, unknown>): string {
    return (this.i18n.global.t as TranslateFunction)(key, params)
  }
}

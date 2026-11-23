import { describe, expect, it } from 'vitest'
import { getLocaleMessages } from '../../i18n/messagesServer'
import { createMockStorefrontContext } from '../../test/utils/context'
import { ServerI18nService } from './i18n'

function createService(locale: string) {
  return new ServerI18nService(
    createMockStorefrontContext({ country: { locale } }),
  )
}

describe('ServerI18nService', () => {
  it.for(['en-US', 'de-DE'])(
    'translates through the %s locale of the storefront country',
    (locale) => {
      expect(createService(locale).t('wishlist_page.title')).toBe(
        getLocaleMessages(locale).wishlist_page.title,
      )
    },
  )

  it('interpolates named parameters', () => {
    const title = createService('en-US').t('global.seo_title_with_shop_name', {
      title: 'Wishlist',
      shopName: 'Test Shop',
    })

    expect(title).toContain('Wishlist')
    expect(title).toContain('Test Shop')
  })

  it.for([
    ['fr-FR', 'its own file', 'Langue et pays'],
    ['en-AU', 'the fallback locale file', 'Sprache und Land'],
  ] as const)('translates %s through %s', ([locale, _source, expected]) => {
    expect(createService(locale).t('shop_selector.flyout_title')).toBe(expected)
  })

  it('returns the key itself for an unknown message', () => {
    // The key is deliberately absent from every locale file, which is what the
    // lint rule below otherwise flags.
    // eslint-disable-next-line @intlify/vue-i18n/no-missing-keys
    expect(createService('en-US').t('does.not.exist')).toBe('does.not.exist')
  })
})

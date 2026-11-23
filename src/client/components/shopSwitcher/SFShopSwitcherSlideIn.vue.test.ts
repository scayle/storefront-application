import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type {
  AvailableCountry,
  AvailableLanguage,
} from '@scayle/storefront/types'
import SFShopSwitcherSlideIn from './SFShopSwitcherSlideIn.vue'

vi.mock('@client/composables/useShopSwitcher', () => {
  const englishShop: AvailableLanguage = {
    code: 'en',
    name: 'English',
    locale: 'en-US',
    url: 'https://example.com/en-us',
  }
  const unitedStates: AvailableCountry = {
    code: 'US',
    name: 'United States',
    languages: [englishShop],
  }

  return {
    useShopSwitcher: () => ({
      availableLanguages: [englishShop],
      availableCountries: [unitedStates],
      currentLocale: new Intl.Locale('en-US'),
    }),
  }
})

const stubs = {
  // The SUT's own `data-testid="shop-switcher-slide-in"` falls through onto the
  // stub root, replacing any testid the stub template declares.
  SFSlideIn: {
    props: ['isOpen'],
    template:
      '<div data-testid="shop-switcher-slide-in" :data-open="String(isOpen)"><slot name="icon" /><slot /></div>',
  },
  SFShopSwitcherFlyoutBody: {
    props: ['availableLanguages', 'availableCountries', 'currentLocale'],
    template:
      '<div data-testid="flyout-body" :data-language-count="availableLanguages.length" :data-country-count="availableCountries.length" />',
  },
}

const mocks = { $t: (key: string) => key }

function mountSlideIn({ open = false }: { open?: boolean } = {}) {
  return mount(SFShopSwitcherSlideIn, {
    props: { open },
    global: { stubs, mocks },
  })
}

describe('SFShopSwitcherSlideIn.vue', () => {
  it('passes the shops from useShopSwitcher to the flyout body', () => {
    const wrapper = mountSlideIn()
    const flyoutBody = wrapper.find('[data-testid="flyout-body"]')

    expect(flyoutBody.attributes('data-language-count')).toBe('1')
    expect(flyoutBody.attributes('data-country-count')).toBe('1')
  })

  it('labels the slide-in with the flyout title', () => {
    const wrapper = mountSlideIn()

    expect(
      wrapper
        .find('[data-testid="shop-switcher-slide-in"]')
        .attributes('label'),
    ).toBe('shop_selector.flyout_title')
  })

  it('follows the open model', async () => {
    const wrapper = mountSlideIn({ open: false })
    const slideIn = wrapper.find('[data-testid="shop-switcher-slide-in"]')

    expect(slideIn.attributes('data-open')).toBe('false')

    await wrapper.setProps({ open: true })
    expect(slideIn.attributes('data-open')).toBe('true')
  })
})

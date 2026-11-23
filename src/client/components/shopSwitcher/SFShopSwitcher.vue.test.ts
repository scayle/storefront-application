import { describe, it, expect, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'
import SFShopSwitcher from './SFShopSwitcher.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

vi.mock('@client/composables/useShopSwitcher', () => ({
  useShopSwitcher: () => ({
    currentLocale: computed(() => new Intl.Locale('de-DE')),
    selectedLanguage: computed(() => 'German'),
    selectedCountry: computed(() => 'Germany'),
    shopName: computed(() => 'Example Shop'),
    hasOtherShops: computed(() => true),
  }),
}))

vi.mock('@client/composables/useShopSwitcherSlideIn', () => ({
  useShopSwitcherSlideIn: () => ({
    isOpen: ref(false),
    open: vi.fn(),
    triggerAttrs: {},
  }),
}))

const labelKey =
  'shop_selector.aria_label({"selectedCountry":"Germany","selectedLanguage":"German"})'

describe('SFShopSwitcher.vue', () => {
  it.for([
    { name: 'header', placement: 'header', visibleText: 'DE' },
    { name: 'default (header)', placement: undefined, visibleText: 'DE' },
    { name: 'sidebar', placement: 'sidebar', visibleText: 'Example Shop' },
  ] as const)(
    'starts the $name trigger name with its visible text',
    ({ placement, visibleText }) => {
      const wrapper = mount(SFShopSwitcher, { props: { placement } })

      expect(
        wrapper.get('[data-testid="shop-switcher-current-shop"]').text(),
      ).toBe(visibleText)
      expect(
        wrapper
          .get('[data-testid="language-listbox"]')
          .attributes('aria-label'),
      ).toBe(`${visibleText}, ${labelKey}`)
    },
  )
})

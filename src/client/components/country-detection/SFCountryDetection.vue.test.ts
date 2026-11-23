import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SFCountryDetection from './SFCountryDetection.vue'

// The shared `t` echoes the values a label receives, so the country names show
// up in the rendered text. `te` finds no override for any country code, so the
// names come from `Intl.DisplayNames`.
vi.mock('vue-i18n', async () => {
  const { t } = await import('@test/mocks/vue-i18n')
  return { useI18n: () => ({ t, te: () => false }) }
})

const markUserAsPrompted = vi.fn()

const usShop = {
  code: 'en',
  name: 'English',
  locale: 'en-US',
  url: 'https://example.com/en',
}
const deShop = {
  locale: 'de-DE',
  shopCountryId: 1918,
  countryCode: 'DE',
  name: 'Germany',
  domain: 'example.com',
  path: 'de',
}
const suggestedShops = ref([usShop])
const detectedRegion = ref('US')
const currentCountry = ref(deShop)

vi.mock('@client/composables/useCountryDetection', () => ({
  useCountryDetection: () => ({
    suggestedShops,
    detectedRegion,
    suggestionActive: ref(true),
    markUserAsPrompted,
    hasPromptedUser: ref(false),
    hasSwitchedShops: ref(false),
    markShopAsSwitched: vi.fn(),
  }),
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    country: currentCountry,
    config: ref({}),
  }),
}))

const SFModalStub = defineComponent({
  name: 'SFModal',
  props: {
    visible: { type: Boolean, default: false },
    headline: { type: String, default: undefined },
    description: { type: String, default: undefined },
  },
  emits: ['update:visible', 'close'],
  setup(props, { slots, attrs, emit }) {
    const closeModal = () => {
      emit('close')
      emit('update:visible', false)
    }

    return () => {
      if (!props.visible) {
        return null
      }

      return h('div', { ...attrs }, [
        h('h2', props.headline),
        h('p', props.description),
        slots.default?.({ closeModal }),
        h('button', { 'data-testid': 'close-button', onClick: closeModal }),
      ])
    }
  },
})

// SFButton renders as an `<a>` when `:to` is set (delegates to SFLink).
const LinkOrButtonStub = defineComponent({
  name: 'SFButton',
  props: { to: { type: String, default: undefined } },
  setup(props, { slots, attrs }) {
    return () =>
      props.to
        ? h('a', { ...attrs, href: props.to }, slots.default?.())
        : h('button', { ...attrs }, slots.default?.())
  },
})

const i18nGlobal = {
  mocks: {
    $t: (key: string) => key,
  },
}

// `Layout` decides when to open the modal; here it is always mounted open, as
// the overlay host mounts it on its first open. The handler plays the host's
// part of the `open` model.
const mountComponent = () => {
  const wrapper = mount(SFCountryDetection, {
    props: {
      open: true,
      'onUpdate:open': (open: boolean) => wrapper.setProps({ open }),
    },
    global: {
      ...i18nGlobal,
      stubs: { SFModal: SFModalStub, SFButton: LinkOrButtonStub },
    },
  })
  return wrapper
}

describe('SFCountryDetection', () => {
  beforeEach(() => {
    suggestedShops.value = [usShop]
    detectedRegion.value = 'US'
    currentCountry.value = { ...deShop, locale: 'en-GB' }
  })

  it('shows the dialog when open', async () => {
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(
      wrapper.find('[data-testid="country-detection-dialog"]').exists(),
    ).toBe(true)
  })

  it('closes the dialog when the user follows a shop link', async () => {
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    await wrapper
      .get('[data-testid="country-detection-switch-us"]')
      .trigger('click')

    expect(
      wrapper.find('[data-testid="country-detection-dialog"]').exists(),
    ).toBe(false)
  })

  it('offers the shop of a single-language country under the country name', async () => {
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    const link = wrapper.get('[data-testid="country-detection-switch-us"]')
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('https://example.com/en')
    expect(link.attributes('lang')).toBeUndefined()
    expect(link.text()).toBe(
      'country_detection.shop_in_country({"detectedCountry":"United States"})',
    )
    expect(wrapper.get('p').text()).toBe(
      'country_detection.subline_single_language({"currentCountry":"Germany"})',
    )
  })

  it('offers one shop per language of a multi-language country, named in that language', async () => {
    suggestedShops.value = [
      {
        code: 'de',
        name: 'Deutsch',
        locale: 'de-CH',
        url: 'https://example.com/ch-de',
      },
      {
        code: 'fr',
        name: 'français',
        locale: 'fr-CH',
        url: 'https://example.com/ch-fr',
      },
    ]
    detectedRegion.value = 'CH'

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    const french = wrapper.get('[data-testid="country-detection-switch-ch-fr"]')
    expect(french.text()).toBe('Français')
    expect(french.attributes('href')).toBe('https://example.com/ch-fr')
    expect(french.attributes('lang')).toBe('fr-CH')
    expect(
      wrapper.get('[data-testid="country-detection-switch-ch-de"]').text(),
    ).toBe('Deutsch')
    expect(wrapper.get('p').text()).toBe(
      'country_detection.subline_multi_language({"currentCountry":"Germany","detectedCountry":"Switzerland"})',
    )
  })

  it('names countries by country code, not by the locale region', async () => {
    suggestedShops.value = [
      {
        code: 'en',
        name: 'English',
        locale: 'en-GB',
        url: 'https://example.com/at',
      },
    ]
    detectedRegion.value = 'AT'

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.get('h2').text()).toBe(
      'country_detection.headline({"detectedCountry":"Austria"})',
    )
    expect(wrapper.get('[data-testid="country-detection-stay"]').text()).toBe(
      'country_detection.stay_in_country({"currentCountry":"Germany"})',
    )
  })

  it('closes the dialog and marks the user as prompted when they choose to stay', async () => {
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    await wrapper.get('[data-testid="country-detection-stay"]').trigger('click')

    expect(markUserAsPrompted).toHaveBeenCalledTimes(1)
    expect(
      wrapper.find('[data-testid="country-detection-dialog"]').exists(),
    ).toBe(false)
  })

  it('marks the user as prompted when the dialog is closed', async () => {
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    await wrapper.get('[data-testid="close-button"]').trigger('click')

    expect(markUserAsPrompted).toHaveBeenCalledTimes(1)
  })
})

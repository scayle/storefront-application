import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import type { RFC3339Date } from '@scayle/storefront-api'
import type { DetailedProduct } from '@scayle/storefront/types'
import SFVariantPicker from '@client/components/product/SFVariantPicker.vue'
import SFExpressCheckoutPDP from '@client/components/checkout/SFExpressCheckoutPDP.vue'
import { EXPRESS_CHECKOUT_RESET_EVENT } from '@client/utils/expressCheckout'
import {
  createMockDetailedProduct,
  createMockProductVariant,
} from '@test/mock-data/products'
import SFProductActions from './SFProductActions.vue'

const mocks = vi.hoisted(() => ({
  addItem: vi.fn(),
  trackAddToBasket: vi.fn(),
  announce: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@client/composables/useAnnouncer', () => ({
  useAnnouncer: () => ({ announce: mocks.announce }),
}))

vi.mock('@client/composables/useBasket', () => ({
  useBasket: () => ({ addItem: mocks.addItem }),
}))

vi.mock('@client/composables/tracking/useBasketEvents', () => ({
  useBasketEvents: () => ({ trackAddToBasket: mocks.trackAddToBasket }),
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    country: computed(() => ({ locale: 'en-GB' })),
  }),
}))

vi.mock('@vueuse/core', async () => {
  const actual =
    await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')
  return {
    ...actual,
    useElementVisibility: () => ref(true),
  }
})

const tMock = (key: string) => key

const focusSpy = vi.fn()

const stubs = {
  SFButton: {
    emits: ['click'],
    template:
      '<button :data-testid="$attrs[\'data-testid\']" :aria-disabled="$attrs[\'aria-disabled\']" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  SFSkeletonLoader: true,
  ClientOnly: { template: '<div><slot /></div>' },
  Teleport: { template: '<div><slot /></div>' },
  SFScrollToTopButton: true,
  SFQuantityInput: true,
  SFVariantPicker: {
    props: ['visible', 'activeVariant', 'variants'],
    emits: ['update:visible', 'update:activeVariant'],
    template: '<div />',
    methods: { focus: focusSpy },
  },
  SFWishlistToggle: true,
  SFLowStockBanner: true,
  SFExpressCheckoutPDP: true,
  IconIncrementPlus: true,
  IconCommerceBasket: true,
}

function makeWrapper(
  product: DetailedProduct,
  activeVariant?: DetailedProduct['variants'][number],
  quantity = 1,
) {
  return mount(SFProductActions, {
    props: {
      product,
      activeVariant,
      quantity,
    },
    global: {
      stubs,
      mocks: { $t: tMock },
    },
  })
}

const desktopButton = '[data-testid="add-item-to-basket-button"]'
const mobileButton = '[data-testid="add-to-basket-button-mobile"]'

describe('SFProductActions', () => {
  beforeEach(() => {
    mocks.addItem.mockReset()
    mocks.trackAddToBasket.mockReset()
    mocks.announce.mockReset()
    focusSpy.mockReset()
  })

  it.for([
    {
      condition: 'the product is sold out',
      product: createMockDetailedProduct({ isSoldOut: true }),
    },
    {
      condition: 'the selected variant is sold out',
      product: createMockDetailedProduct({
        isSoldOut: false,
        sellableTimeframe: { state: 'active' },
        variants: [createMockProductVariant({ stock: 0, isSoldOut: true })],
      }),
    },
    {
      condition: 'the sellable timeframe has ended',
      product: createMockDetailedProduct({
        isSoldOut: false,
        sellableTimeframe: {
          state: 'past',
          sellableTo: '2024-01-01T00:00:00+00:00' as RFC3339Date,
        },
      }),
    },
    {
      condition: 'the sellable timeframe starts in the future',
      product: createMockDetailedProduct({
        isSoldOut: false,
        sellableTimeframe: {
          state: 'future',
          sellableFrom: '2099-01-01T00:00:00+00:00' as RFC3339Date,
        },
      }),
    },
  ])('disables both buttons when $condition', ({ product }) => {
    const wrapper = makeWrapper(product, product.variants[0])

    expect(wrapper.get(desktopButton).attributes('aria-disabled')).toBe('true')
    expect(wrapper.get(mobileButton).attributes('aria-disabled')).toBe('true')
  })

  it('enables both buttons when active variant has stock > 0 and product is in sellable timeframe', () => {
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product, product.variants[0])

    expect(
      wrapper.get(desktopButton).attributes('aria-disabled'),
    ).toBeUndefined()
    expect(
      wrapper.get(mobileButton).attributes('aria-disabled'),
    ).toBeUndefined()
  })

  it('shows the sold-out label on the active button when active variant is out of stock', () => {
    const product = createMockDetailedProduct({
      variants: [createMockProductVariant({ stock: 0, isSoldOut: true })],
    })
    const wrapper = makeWrapper(product, product.variants[0])

    expect(wrapper.get(desktopButton).text()).toBe('global.sold_out')
  })

  it('shows the default add-to-basket label when active variant is in stock', () => {
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product, product.variants[0])

    expect(wrapper.get(desktopButton).text()).toBe(
      'add_to_basket.add_to_basket',
    )
  })

  it('announces "select a size" when add-to-basket is activated without an active variant', async () => {
    // No `activeVariant` → handler falls into the picker-open branch and
    // announces the prompt through the shared live region.
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product)

    await wrapper.get(desktopButton).trigger('click')

    expect(mocks.announce).toHaveBeenCalledWith(
      'add_to_basket.a11y.select_size',
    )
    // Nothing was actually added to the basket.
    expect(mocks.addItem).not.toHaveBeenCalled()
  })

  it('tracks add_to_basket with the units the basket gained, not the requested quantity', async () => {
    // The Storefront API caps an add at the available stock, so the picker can
    // ask for two units and the basket gain one.
    mocks.addItem.mockResolvedValue(1)
    const product = createMockDetailedProduct()
    const variant = product.variants[0]
    const wrapper = makeWrapper(product, variant, 2)

    await wrapper.get(desktopButton).trigger('click')

    expect(mocks.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ variantId: variant?.id, quantity: 2 }),
    )
    expect(mocks.trackAddToBasket).toHaveBeenCalledWith(variant, product, 1)
  })

  it('does not track add_to_basket when the basket gained nothing', async () => {
    mocks.addItem.mockResolvedValue(0)
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product, product.variants[0])

    await wrapper.get(desktopButton).trigger('click')

    expect(mocks.addItem).toHaveBeenCalledTimes(1)
    expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
  })

  it('does not call addItem when the button is aria-disabled (out of stock)', async () => {
    // The button stays focusable (aria-disabled, not native) so the click
    // handler still receives the event — the guard inside has to short-circuit.
    const product = createMockDetailedProduct({ isSoldOut: true })
    const wrapper = makeWrapper(product, product.variants[0])

    await wrapper.get(desktopButton).trigger('click')

    expect(mocks.addItem).not.toHaveBeenCalled()
    // Also no "select a size" announcement — the early return runs first.
    expect(mocks.announce).not.toHaveBeenCalled()
  })

  it('moves focus to the variant picker on keyboard activation without a variant', async () => {
    // `event.detail === 0` is how browsers signal keyboard-initiated clicks
    // (Enter/Space on a focused button). The handler uses that to move focus
    // to the picker so the prompt is one keypress away.
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product)

    await wrapper.get(desktopButton).trigger('click', { detail: 0 })
    await wrapper.vm.$nextTick()

    expect(focusSpy).toHaveBeenCalledOnce()
  })

  it('does not move focus on mouse activation', async () => {
    // Real mouse clicks carry `detail >= 1`; the picker shouldn't grab focus
    // away from the mouse user's spatial context.
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product)

    await wrapper.get(desktopButton).trigger('click', { detail: 1 })
    await wrapper.vm.$nextTick()

    expect(focusSpy).not.toHaveBeenCalled()
  })

  it('opens the size dropdown when express checkout reports a missing size', async () => {
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product)

    wrapper.findComponent(SFExpressCheckoutPDP).vm.$emit('sizeMissing')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(SFVariantPicker).props('visible')).toBe(true)
  })

  it('resets the express button when the size dropdown is dismissed without a selection', async () => {
    // Click-outside / Escape closes the dropdown with no variant chosen. The
    // storefront returns the express button to its default state via the
    // global reset event the checkout web component listens to.
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product)
    const dispatchSpy = vi.spyOn(document, 'dispatchEvent')

    wrapper.findComponent(SFExpressCheckoutPDP).vm.$emit('sizeMissing')
    await wrapper.vm.$nextTick()
    wrapper.findComponent(SFVariantPicker).vm.$emit('update:visible', false)
    await wrapper.vm.$nextTick()

    const resetDispatched = dispatchSpy.mock.calls.some(
      ([event]) =>
        event instanceof Event && event.type === EXPRESS_CHECKOUT_RESET_EVENT,
    )
    expect(resetDispatched).toBe(true)
  })

  it('does not reset the express button when a size is selected in the dropdown', async () => {
    // A real selection closes the dropdown with `activeVariant` set, so the
    // express flow resumes instead of being reset.
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product)
    const dispatchSpy = vi.spyOn(document, 'dispatchEvent')

    wrapper.findComponent(SFExpressCheckoutPDP).vm.$emit('sizeMissing')
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ activeVariant: product.variants[0] })
    wrapper.findComponent(SFVariantPicker).vm.$emit('update:visible', false)
    await wrapper.vm.$nextTick()

    const resetDispatched = dispatchSpy.mock.calls.some(
      ([event]) =>
        event instanceof Event && event.type === EXPRESS_CHECKOUT_RESET_EVENT,
    )
    expect(resetDispatched).toBe(false)
  })

  it('passes the size picked in the dropdown on to the page', async () => {
    const product = createMockDetailedProduct()
    const wrapper = makeWrapper(product)

    wrapper
      .findComponent(SFVariantPicker)
      .vm.$emit('update:activeVariant', product.variants[0])
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:activeVariant')).toEqual([
      [product.variants[0]],
    ])
  })
})

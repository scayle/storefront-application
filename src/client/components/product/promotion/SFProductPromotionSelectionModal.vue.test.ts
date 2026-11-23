import { beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type {
  DetailedProduct,
  BuyXGetYEffect,
  Promotion,
} from '@scayle/storefront/types'
import {
  createMockDetailedProduct,
  createMockProductVariant,
} from '@test/mock-data/products'
import { createMockPromotion } from '@test/mock-data/promotions'
import { t } from '@test/mocks/vue-i18n'
import SFProductPromotionSelectionModal from './SFProductPromotionSelectionModal.vue'

// Hoisted so the assertions reach the same spies the component held: a factory
// that calls `vi.fn()` inline hands out a fresh spy on every composable call.
const mocks = vi.hoisted(() => ({
  addItem: vi.fn(),
  trackAddToBasket: vi.fn(),
}))

vi.mock('@client/composables/useBasket', () => ({
  useBasket: () => ({ basket: { value: null }, addItem: mocks.addItem }),
}))

vi.mock('@client/composables/tracking/useBasketEvents', () => ({
  useBasketEvents: () => ({
    trackAddToBasket: mocks.trackAddToBasket,
    trackRemoveFromBasket: vi.fn(),
    trackViewBasket: vi.fn(),
  }),
}))

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: vi.fn() }),
}))

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

const giftPromotion: Promotion<BuyXGetYEffect> = {
  ...createMockPromotion({ id: 'bxgy-1' }),
  effect: {
    type: 'buy_x_get_y',
    eligibleItemsQuantity: 2,
    applicableItemSelectionType: 'variant_ids',
    discountType: 'relative',
    value: '-100%',
    variantIds: [1],
  },
}

const defaultStubs = {
  SFModal: {
    name: 'SFModal',
    props: ['visible', 'labelledBy'],
    template: '<div><slot /></div>',
  },
  SFFadeInTransition: { template: '<div><slot /></div>' },
  SFProductImage: { template: '<img />' },
  SFWishlistToggle: {
    props: ['product', 'productListType', 'productListId'],
    template:
      '<span data-testid="promo-wishlist-toggle" :data-surface="productListType" :data-surface-id="productListId" />',
  },
  SFVariantPicker: {
    name: 'SFVariantPicker',
    props: ['reductionLabel', 'visible'],
    emits: ['update:activeVariant', 'update:visible'],
    template:
      '<div data-testid="variant-picker" :data-reduction="reductionLabel" />',
  },
  // Sets `aria-busy` only while loading, as the real button does.
  SFButton: {
    props: ['loading'],
    template: '<button :aria-busy="loading || undefined"><slot /></button>',
  },
}

function mountModal(
  props: { visible?: boolean; product?: DetailedProduct } = {},
  errorHandler?: () => void,
) {
  return mount(SFProductPromotionSelectionModal, {
    props: {
      visible: true,
      product: createMockDetailedProduct(),
      promotion: giftPromotion,
      ...props,
    },
    global: {
      stubs: defaultStubs,
      mocks: { $t: t },
      config: { errorHandler },
    },
  })
}

describe('SFProductPromotionSelectionModal.vue', () => {
  beforeEach(() => {
    mocks.addItem.mockReset().mockResolvedValue(1)
    mocks.trackAddToBasket.mockReset()
  })

  it('opens the modal when visible is true', () => {
    const wrapper = mountModal({ visible: true })

    expect(wrapper.getComponent({ name: 'SFModal' }).props('visible')).toBe(
      true,
    )
  })

  it('keeps the modal closed when visible is false', () => {
    const wrapper = mountModal({ visible: false })

    expect(wrapper.getComponent({ name: 'SFModal' }).props('visible')).toBe(
      false,
    )
  })

  it('shows product name and brand', () => {
    const wrapper = mountModal({
      product: createMockDetailedProduct({ name: 'Free Socks', brand: 'Nike' }),
    })

    expect(wrapper.text()).toContain('Free Socks')
    expect(wrapper.text()).toContain('Nike')
  })

  it('passes the promotion reduction to the variant picker', () => {
    // The gift promotion's effect is not free, so the label is its value.
    const wrapper = mountModal()

    expect(
      wrapper
        .get('[data-testid="variant-picker"]')
        .attributes('data-reduction'),
    ).toBe('-100%')
  })

  it('labels the modal with the product name heading', () => {
    const wrapper = mountModal({
      product: createMockDetailedProduct({ name: 'Free Socks' }),
    })

    const labelId = wrapper
      .getComponent({ name: 'SFModal' })
      .props('labelledBy')
    const heading = wrapper.get(`#${labelId}`)

    expect(heading.element.tagName).toBe('H3')
    expect(heading.text()).toBe('Free Socks')
  })

  it('hands every wishlist toggle the gift selection surface and the promotion id', () => {
    const wrapper = mountModal()

    const toggles = wrapper.findAll('[data-testid="promo-wishlist-toggle"]')

    expect(toggles).not.toHaveLength(0)
    for (const toggle of toggles) {
      expect(toggle.attributes('data-surface')).toBe('gift_selection')
      expect(toggle.attributes('data-surface-id')).toBe('bxgy-1')
    }
  })

  it('tracks the add with the gift selection surface and the promotion id', async () => {
    const product = createMockDetailedProduct()
    const wrapper = mountModal({ product })

    await wrapper
      .get('[data-testid="add-item-to-basket-button"]')
      .trigger('click')
    await flushPromises()

    expect(mocks.trackAddToBasket).toHaveBeenCalledTimes(1)
    expect(mocks.trackAddToBasket).toHaveBeenCalledWith(
      product.variants[0],
      product,
      1,
      { product_list_type: 'gift_selection', product_list_id: 'bxgy-1' },
    )
  })

  it('closes without tracking an add when the basket mutation fails', async () => {
    mocks.addItem.mockResolvedValue(false)
    const wrapper = mountModal()

    await wrapper
      .get('[data-testid="add-item-to-basket-button"]')
      .trigger('click')
    await flushPromises()

    expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
  })

  it('stops loading and stays open when adding to the basket throws', async () => {
    const error = new Error('Storefront API unavailable')
    mocks.addItem.mockRejectedValue(error)
    // The add has no catch, so the rejection reaches the app error handler,
    // which logs it instead of the failure passing silently.
    const errorHandler = vi.fn()
    const wrapper = mountModal({}, errorHandler)
    const addButton = wrapper.get('[data-testid="add-item-to-basket-button"]')

    await addButton.trigger('click')
    await flushPromises()

    expect(addButton.attributes('aria-busy')).toBeUndefined()
    expect(wrapper.emitted('update:visible')).toBeUndefined()
    expect(mocks.trackAddToBasket).not.toHaveBeenCalled()
    expect(errorHandler).toHaveBeenCalledWith(
      error,
      expect.anything(),
      expect.any(String),
    )
  })

  it('opens the variant list instead of adding when no variant is in stock', async () => {
    const wrapper = mountModal({
      product: createMockDetailedProduct({
        variants: [
          createMockProductVariant({ id: 1, stock: 0, isSoldOut: true }),
          createMockProductVariant({ id: 2, stock: 0, isSoldOut: true }),
        ],
      }),
    })

    await wrapper
      .get('[data-testid="add-item-to-basket-button"]')
      .trigger('click')
    await flushPromises()

    expect(
      wrapper.getComponent({ name: 'SFVariantPicker' }).props('visible'),
    ).toBe(true)
    expect(mocks.addItem).not.toHaveBeenCalled()
  })

  it('renders no wishlist toggle when the product has no image', () => {
    const wrapper = mountModal({
      product: createMockDetailedProduct({ images: [] }),
    })

    expect(
      wrapper.findAll('[data-testid="promo-wishlist-toggle"]'),
    ).toHaveLength(0)
  })

  it('adds the size picked in the dropdown to the basket', async () => {
    const product = createMockDetailedProduct({
      variants: [
        createMockProductVariant({ id: 1 }),
        createMockProductVariant({ id: 2 }),
      ],
    })
    const wrapper = mountModal({ product })

    wrapper
      .getComponent({ name: 'SFVariantPicker' })
      .vm.$emit('update:activeVariant', product.variants[1])
    await wrapper
      .get('[data-testid="add-item-to-basket-button"]')
      .trigger('click')
    await flushPromises()

    expect(mocks.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ variantId: 2 }),
    )
  })
})

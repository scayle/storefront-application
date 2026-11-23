import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { BuyXGetYEffect, Promotion } from '@scayle/storefront/types'
import {
  createMockDetailedProduct,
  createMockProductVariant,
  createMockVariantPrice,
} from '@test/mock-data/products'
import { createMockPromotion } from '@test/mock-data/promotions'
import { t } from '@test/mocks/vue-i18n'
import SFGiftPromotionProduct from './SFGiftPromotionProduct.vue'

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
  SFProductPrice: { template: '<span data-testid="price" />' },
  SFProductImage: { template: '<img data-testid="product-image" />' },
  SFButton: {
    // Declared, so the parent's click listener does not also fall through to
    // the native button and fire a second time.
    emits: ['click'],
    template:
      '<button data-testid="add-free-product-button" @click="$emit(\'click\')"><slot /></button>',
  },
  IconIncrementPlus: { template: '<span />' },
}

describe('SFGiftPromotionProduct.vue', () => {
  it('renders product name and brand', () => {
    const product = createMockDetailedProduct({
      name: 'Free Socks',
      brand: 'Nike',
    })
    const wrapper = mount(SFGiftPromotionProduct, {
      props: { product, promotion: giftPromotion },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    expect(wrapper.text()).toContain('Free Socks')
    expect(wrapper.text()).toContain('Nike')
  })

  it('renders product name as semantic heading', () => {
    const product = createMockDetailedProduct({ name: 'Free Socks' })
    const wrapper = mount(SFGiftPromotionProduct, {
      props: { product, promotion: giftPromotion },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    const headline = wrapper.get('[data-testid="pdp-product-name-gift"]')

    expect(headline.text()).toBe('Free Socks')
    expect(headline.element.tagName).toBe('H3')
  })

  it('prices the gift from its first variant', () => {
    const product = createMockDetailedProduct({
      price: {
        ...createMockVariantPrice({ finalPrice: '€25.00' }),
        hasDifferentPrices: false,
      },
      variants: [
        createMockProductVariant({
          price: createMockVariantPrice({ finalPrice: '€12.00' }),
        }),
      ],
    })
    const wrapper = mount(SFGiftPromotionProduct, {
      props: { product, promotion: giftPromotion },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    expect(
      wrapper.get('[data-testid="gift-promotion-originally-row"]').text(),
    ).toBe('price.originally €12.00')
  })

  it('prices the gift from the product when it has no variants', () => {
    const product = createMockDetailedProduct({
      price: {
        ...createMockVariantPrice({ finalPrice: '€25.00' }),
        hasDifferentPrices: false,
      },
      variants: [],
    })
    const wrapper = mount(SFGiftPromotionProduct, {
      props: { product, promotion: giftPromotion },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    expect(
      wrapper.get('[data-testid="gift-promotion-originally-row"]').text(),
    ).toBe('price.originally €25.00')
  })

  it('shows sold out text when product is sold out', () => {
    const product = createMockDetailedProduct({ isSoldOut: true })
    const wrapper = mount(SFGiftPromotionProduct, {
      props: { product, promotion: giftPromotion },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    expect(wrapper.text()).toContain('global.sold_out')
  })

  it('emits selectItem with product when add button is clicked', async () => {
    const product = createMockDetailedProduct()
    const wrapper = mount(SFGiftPromotionProduct, {
      props: { product, promotion: giftPromotion },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    await wrapper
      .find('[data-testid="add-free-product-button"]')
      .trigger('click')

    expect(wrapper.emitted('selectItem')).toEqual([[product]])
  })

  it('disables add button when disabled prop is true', () => {
    const wrapper = mount(SFGiftPromotionProduct, {
      props: {
        product: createMockDetailedProduct(),
        promotion: giftPromotion,
        disabled: true,
      },
      global: { stubs: defaultStubs, mocks: { $t: t } },
    })

    const button = wrapper.get<HTMLButtonElement>(
      '[data-testid="add-free-product-button"]',
    )
    expect(button.element.disabled).toBe(true)
  })
})

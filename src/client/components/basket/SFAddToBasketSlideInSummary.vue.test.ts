import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMockBasketItem } from '@test/mock-data/basket'
import {
  createMockListingProduct,
  createMockProductVariant,
} from '@test/mock-data/products'
import { SFButtonStub } from '@test/stubs/common'
import { routes } from '@shared/routes'
import SFAddToBasketSlideInSummary from './SFAddToBasketSlideInSummary.vue'

const mountSummary = () =>
  mount(SFAddToBasketSlideInSummary, {
    props: {
      item: createMockBasketItem({
        quantity: 2,
        product: createMockListingProduct({
          brand: 'Brand',
          name: 'Test product',
          color: 'Blue',
        }),
        variant: createMockProductVariant({ label: 'L' }),
      }),
    },
    global: {
      stubs: {
        SFProductImage: true,
        SFProductPrice: true,
        SFButton: SFButtonStub,
      },
      mocks: { $t: (key: string) => key },
    },
  })

describe('SFAddToBasketSlideInSummary', () => {
  it('shows the brand and product name of the added line', () => {
    const wrapper = mountSummary()

    expect(wrapper.text()).toContain('Brand')
    expect(wrapper.text()).toContain('Test product')
  })

  it('shows the color, size and quantity of the added line', () => {
    const details = mountSummary()
      .findAll('[data-testid="label-value"]')
      .map((labelValue) => labelValue.text())

    expect(details).toEqual([
      'product_attribute.color: Blue',
      'product_attribute.size: L',
      'global.quantity: 2',
    ])
  })

  it('shows the 30-day best price next to the final price', () => {
    const price = mountSummary().findComponent({ name: 'SFProductPrice' })

    expect(price.props('showLowestPriorPrice')).toBe(true)
  })

  it('does not link the added line to its product detail page', () => {
    const card = mountSummary().find(
      '[data-testid="add-to-basket-slide-in-card"]',
    )

    expect(card.find('a').exists()).toBe(false)
  })

  it('offers the basket and checkout as the two next steps', () => {
    const wrapper = mountSummary()

    expect(
      wrapper
        .get('[data-testid="add-to-basket-slide-in-go-to-basket"]')
        .attributes('href'),
    ).toBe(routes.basket)
    expect(
      wrapper
        .get('[data-testid="add-to-basket-slide-in-go-to-checkout"]')
        .attributes('href'),
    ).toBe(routes.checkout)
  })
})

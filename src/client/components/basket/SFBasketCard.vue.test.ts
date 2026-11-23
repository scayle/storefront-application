import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import type { RFC3339Date } from '@scayle/storefront-api'
import { createMockBasketItem } from '@test/mock-data/basket'
import {
  createMockListingProduct,
  createMockProductVariant,
} from '@test/mock-data/products'
import { t } from '@test/mocks/vue-i18n'
import { SFLinkStub } from '@test/stubs/common'

import SFBasketCard from './SFBasketCard.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

// Props are typed rather than listed: an array declaration skips Vue's Boolean
// casting, so the shorthand `size-editable` attribute would arrive as `''`.
const CardDetailsStub = {
  template: '<div data-testid="card-details-stub" />',
  props: {
    basketItem: { type: Object, required: true },
    isQuantityShown: Boolean,
    sizeEditable: Boolean,
  },
  emits: ['changeVariant'],
}

const futureTimeframe = {
  state: 'future',
  sellableFrom: '2999-01-01T00:00:00+00:00' as RFC3339Date,
} as const

const pastTimeframe = {
  state: 'past',
  sellableTo: '2000-01-01T00:00:00+00:00' as RFC3339Date,
} as const

describe('SFBasketCard', () => {
  const global = {
    stubs: {
      SFBasketCardSoldOutTitle: true,
      SFBasketCardOutOfTimeFrameTitle: true,
      SFBasketCardImage: true,
      SFBasketCardDetails: CardDetailsStub,
      SFProductPrice: true,
      SFQuantityInput: true,
      SFLink: SFLinkStub,
      // Attributes (aria-label, data-testid) fall through to the stub's root.
      SFButton: { template: '<button><slot /></button>' },
    },
    mocks: { $t: t },
  }

  const soldOutTitle = { name: 'SFBasketCardSoldOutTitle' }
  const outOfTimeFrameTitle = { name: 'SFBasketCardOutOfTimeFrameTitle' }
  const quantityInput = { name: 'SFQuantityInput' }

  it.for([
    {
      line: 'an in-stock item inside its sellable timeframe',
      item: createMockBasketItem(),
      title: 'no',
    },
    {
      line: 'an in-stock item outside its sellable timeframe',
      item: createMockBasketItem({
        product: createMockListingProduct({
          sellableTimeframe: futureTimeframe,
        }),
      }),
      title: 'the out-of-timeframe',
    },
    {
      line: 'a sold-out item inside its sellable timeframe',
      item: createMockBasketItem({
        variant: createMockProductVariant({ isSoldOut: true }),
      }),
      title: 'the sold-out',
    },
    {
      line: 'an item both sold out and outside its sellable timeframe',
      item: createMockBasketItem({
        variant: createMockProductVariant({ isSoldOut: true }),
        product: createMockListingProduct({ sellableTimeframe: pastTimeframe }),
      }),
      title: 'the sold-out',
    },
  ])('shows $title title for $line', ({ item, title }) => {
    const wrapper = mount(SFBasketCard, { props: { item }, global })

    expect(wrapper.findComponent(soldOutTitle).exists()).toBe(
      title === 'the sold-out',
    )
    expect(wrapper.findComponent(outOfTimeFrameTitle).exists()).toBe(
      title === 'the out-of-timeframe',
    )
  })

  it('exposes an accessible name on the remove button', () => {
    const item = createMockBasketItem({
      product: createMockListingProduct({ name: 'Test product' }),
    })
    const wrapper = mount(SFBasketCard, {
      props: { item },
      global,
    })

    expect(
      wrapper
        .get('[data-testid="basket-remove-item-button"]')
        .attributes('aria-label'),
    ).toBe('basket_card.remove_item({"name":"Test product"})')
  })

  it('requests the removal when the remove button is clicked', async () => {
    const wrapper = mount(SFBasketCard, {
      props: { item: createMockBasketItem() },
      global,
    })

    await wrapper
      .get('[data-testid="basket-remove-item-button"]')
      .trigger('click')

    expect(wrapper.emitted('delete')).toEqual([[]])
  })

  it('relays a quantity change from the quantity input', async () => {
    const wrapper = mount(SFBasketCard, {
      props: { item: createMockBasketItem() },
      global,
    })

    // One quantity input per layout, mobile and desktop.
    const inputs = wrapper.findAllComponents(quantityInput)
    for (const input of inputs) {
      await input.vm.$emit('update:quantity', 3)
    }

    expect(inputs).toHaveLength(2)
    expect(wrapper.emitted('updateQuantity')).toEqual([[3], [3]])
  })

  it('does not put an invalid alt attribute on the list item', () => {
    const wrapper = mount(SFBasketCard, {
      props: { item: createMockBasketItem() },
      global,
    })

    expect(
      wrapper.get('[data-testid="basket-card"]').attributes('alt'),
    ).toBeUndefined()
  })

  // The interval label comes from the variant options, so both the stored
  // definition and the variant subscription have to reach the summary.
  it('shows the subscription interval resolved from the variant options', () => {
    const item = createMockBasketItem({
      customData: {
        subscriptionDefinition: { subscriptionInterval: 'monthly' },
      },
      variant: createMockProductVariant({
        subscription: {
          intervals: [{ label: 'Every month', value: 'monthly' }],
        },
      }),
    })

    const wrapper = mount(SFBasketCard, { props: { item }, global })

    // One summary per layout: below the details on mobile, next to the price
    // on desktop.
    const summaries = wrapper.findAll('[data-testid="subscription-data"]')
    expect(summaries).toHaveLength(2)
    for (const summary of summaries) {
      expect(summary.text()).toContain('subscription.interval: Every month')
    }
  })

  it('shows how many units are left on a low-stock line', () => {
    const item = createMockBasketItem({
      isLowStock: true,
      availableQuantity: 3,
    })

    const wrapper = mount(SFBasketCard, { props: { item }, global })

    expect(wrapper.get('[data-testid="low-stock-banner"]').text()).toBe(
      'low_stock.x_left({"count":3})',
    )
  })

  // The sold-out title already tells the customer the line cannot be ordered.
  it('hides the low-stock banner on a sold-out line', () => {
    const item = createMockBasketItem({
      isLowStock: true,
      variant: createMockProductVariant({ isSoldOut: true }),
    })

    const wrapper = mount(SFBasketCard, { props: { item }, global })

    expect(wrapper.find('[data-testid="low-stock-banner"]').exists()).toBe(
      false,
    )
  })

  it('enables size editing on the details', () => {
    const wrapper = mount(SFBasketCard, {
      props: { item: createMockBasketItem() },
      global,
    })

    expect(wrapper.findComponent(CardDetailsStub).props('sizeEditable')).toBe(
      true,
    )
  })

  it('relays a size change from the details', async () => {
    const wrapper = mount(SFBasketCard, {
      props: { item: createMockBasketItem() },
      global,
    })

    await wrapper.findComponent(CardDetailsStub).vm.$emit('changeVariant', 7)

    expect(wrapper.emitted('changeVariant')).toEqual([[7]])
  })

  // The selector stays reachable on a sold-out line so the customer can switch
  // to a size in stock, unlike the quantity input, which is hidden.
  it('keeps size editing enabled on a sold-out line', () => {
    const item = createMockBasketItem({
      variant: createMockProductVariant({ isSoldOut: true, stock: 0 }),
    })
    const wrapper = mount(SFBasketCard, { props: { item }, global })

    expect(wrapper.findComponent(CardDetailsStub).props('sizeEditable')).toBe(
      true,
    )
    expect(wrapper.findComponent(quantityInput).exists()).toBe(false)
  })

  // After a size change the page has to reach the picker on the replacement
  // line, which only the card details render. A line without a picker has to
  // read as a miss, so the page falls back to the remove button.
  it.for([true, false])(
    'relays the focus result %s of the details size selector',
    (focused) => {
      const wrapper = mount(SFBasketCard, {
        props: { item: createMockBasketItem() },
        global: {
          ...global,
          stubs: {
            ...global.stubs,
            SFBasketCardDetails: {
              ...CardDetailsStub,
              setup(
                _: unknown,
                { expose }: { expose: (exposed: object) => void },
              ) {
                expose({ focusVariantSelector: () => focused })
              },
            },
          },
        },
      })

      expect(
        (
          wrapper.vm as unknown as { focusVariantSelector: () => boolean }
        ).focusVariantSelector(),
      ).toBe(focused)
    },
  )

  it('moves keyboard focus to the remove button via the exposed focus()', () => {
    const wrapper = mount(SFBasketCard, {
      props: { item: createMockBasketItem() },
      global,
      attachTo: document.body,
    })

    try {
      ;(wrapper.vm as unknown as { focus: () => void }).focus()

      expect(document.activeElement).toBe(
        wrapper.get('[data-testid="basket-remove-item-button"]').element,
      )
    } finally {
      wrapper.unmount()
    }
  })
})

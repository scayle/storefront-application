import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ProductVariant } from '@scayle/storefront/types'
import {
  createMockDetailedProduct,
  createMockProductVariant,
  createMockVariantPrice,
} from '@test/mock-data/products'
import SFProductSubscription from './SFProductSubscription.vue'

// Mock vue-i18n. t echoes the key, ignoring interpolation params.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'en-GB' },
  }),
}))

const stubs = {
  SFProductPrice: {
    template: `<div data-testid="product-price-stub">{{ price.finalPrice }}</div>`,
    props: ['price'],
  },
  SFProductSubscriptionSelection: {
    template: `<div data-testid="subscription-selection-stub"><button @click="$emit('addItemToBasket')" data-testid="selection-button">Add</button></div>`,
    props: [
      'selectedInterval',
      'selectedDeliveryDay',
      'intervals',
      'preferredDeliveryDays',
      'disabled',
      'disabledReason',
    ],
    emits: ['addItemToBasket'],
  },
}

const globalConfig = {
  stubs,
  mocks: {
    $t: (key: string) => key,
  },
}

const mockVariant = createMockProductVariant({
  id: 123,
  subscription: {
    intervals: [{ label: 'Monthly', value: 'monthly' }],
    term: 'No_minimum_term',
    cancellationPolicy: 'Can_cancel_anytime',
  },
})

const mockProduct = createMockDetailedProduct({
  name: 'Test Product',
  variants: [mockVariant],
})

describe('SFProductSubscription.vue', () => {
  it('prompts for a size when no variant is selected', () => {
    const wrapper = mount(SFProductSubscription, {
      props: {
        product: mockProduct,
        variant: undefined,
        quantity: 1,
      },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="subscription-service"]').exists()).toBe(
      true,
    )
    expect(wrapper.text()).toContain('subscription.product.select_size')
  })

  it('shows the subscription price instead of the variant price when eligible and the price has loaded', () => {
    const wrapper = mount(SFProductSubscription, {
      props: {
        product: mockProduct,
        variant: mockVariant,
        quantity: 1,
        subscriptionPrice: createMockVariantPrice({
          finalPrice: '€8.00',
          finalPriceInCents: 800,
        }),
      },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="product-price-stub"]').text()).toBe(
      '€8.00',
    )
    expect(
      wrapper.find('[data-testid="subscription-selection-stub"]').exists(),
    ).toBe(true)
  })

  it('shows no price (never the regular price) while the deferred subscription price is loading', () => {
    const wrapper = mount(SFProductSubscription, {
      props: {
        product: mockProduct,
        variant: mockVariant,
        quantity: 1,
        // subscriptionPrice omitted: still loading
      },
      global: globalConfig,
    })

    // No price is shown (never the regular price); the selection UI still renders.
    expect(wrapper.find('[data-testid="product-price-stub"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.find('[data-testid="subscription-selection-stub"]').exists(),
    ).toBe(true)
  })

  it('shows the not-eligible message when the variant cannot be subscribed to', () => {
    const ineligibleVariant: ProductVariant = {
      ...mockVariant,
      subscription: undefined,
    }

    const wrapper = mount(SFProductSubscription, {
      props: { product: mockProduct, variant: ineligibleVariant, quantity: 1 },
      global: globalConfig,
    })

    expect(wrapper.text()).toContain('subscription.product.not_eligible')
    expect(
      wrapper.find('[data-testid="subscription-selection-stub"]').exists(),
    ).toBe(false)
  })

  it('emits the add payload built from the selected variant, interval and day', async () => {
    const wrapper = mount(SFProductSubscription, {
      props: { product: mockProduct, variant: mockVariant, quantity: 2 },
      global: globalConfig,
    })

    await wrapper.find('[data-testid="selection-button"]').trigger('click')

    const [item] = wrapper.emitted('addItemToBasket')![0] as [
      Record<string, unknown>,
    ]
    expect(item).toEqual({
      productName: 'Test Product',
      variantId: 123,
      quantity: 2,
      customData: {
        subscriptionDefinition: {
          subscriptionInterval: 'monthly',
          subscriptionDeliveryDate: 1,
          subscriptionTerm: 'No_minimum_term',
          subscriptionCancellationPolicy: 'Can_cancel_anytime',
        },
      },
    })
  })
})

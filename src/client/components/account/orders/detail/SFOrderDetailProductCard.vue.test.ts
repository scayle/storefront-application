import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { OrderItem } from '@scayle/storefront/types'
import { createMockOrderItem, defaultVariant } from '@test/mock-data/orders'
import { t } from '@test/mocks/vue-i18n'
import SFOrderDetailProductCard from './SFOrderDetailProductCard.vue'

// SFBasketCardSubscriptionData also reads `locale`, which the shared mock does
// not provide.
vi.mock('vue-i18n', async () => {
  const { t } = await import('@test/mocks/vue-i18n')
  return { useI18n: () => ({ t, locale: { value: 'en-GB' } }) }
})

const mountCard = (orderItem: OrderItem, stubs: Record<string, unknown> = {}) =>
  mount(SFOrderDetailProductCard, {
    props: { orderItem },
    global: {
      stubs: {
        SFProductImage: true,
        SFProductPrice: true,
        SFOrderDetailProductDetails: true,
        SFLink: { template: '<a><slot /></a>' },
        ...stubs,
      },
      mocks: { $t: t },
    },
  })

describe('SFOrderDetailProductCard', () => {
  it('eager-loads the product image', () => {
    const wrapper = mountCard(createMockOrderItem(), {
      SFProductImage: {
        props: ['imageLoading'],
        template:
          '<div data-testid="product-image" :data-loading="imageLoading" />',
      },
    })

    expect(
      wrapper.get('[data-testid="product-image"]').attributes('data-loading'),
    ).toBe('eager')
  })

  it('leaves out the image frame when the product has no image', () => {
    const orderItem = createMockOrderItem()
    const wrapper = mountCard({
      ...orderItem,
      product: { ...orderItem.product, image: undefined },
    })

    expect(
      wrapper.find('[data-testid="order-detail-product-image"]').exists(),
    ).toBe(false)
  })

  it.for([
    {
      name: 'the interval label of the variant',
      orderItem: createMockOrderItem({
        subscriptionDefinition: { subscriptionInterval: 'P1M' },
        variant: {
          ...defaultVariant,
          subscription: { intervals: [{ label: 'Monthly', value: 'P1M' }] },
        },
      }),
      interval: 'Monthly',
    },
    {
      name: 'the stored interval of a variant without subscription options',
      orderItem: createMockOrderItem({
        subscriptionDefinition: { subscriptionInterval: 'P1M' },
      }),
      interval: 'P1M',
    },
  ])('shows $name for a subscription item', ({ orderItem, interval }) => {
    const wrapper = mountCard(orderItem)

    expect(wrapper.get('[data-testid="subscription-data"]').text()).toContain(
      interval,
    )
  })

  it('shows no subscription data for a regular order item', () => {
    const wrapper = mountCard(createMockOrderItem())

    expect(wrapper.find('[data-testid="subscription-data"]').exists()).toBe(
      false,
    )
  })

  it('names the link by its visible content instead of an aria-label', () => {
    const wrapper = mountCard(createMockOrderItem())

    expect(
      wrapper
        .get('[data-testid="order-detail-product-card"]')
        .attributes('aria-label'),
    ).toBeUndefined()
  })

  it('hides the product image from assistive technology so the name is read once', () => {
    const wrapper = mountCard(
      createMockOrderItem({
        product: {
          ...createMockOrderItem().product,
          image: { url: 'https://cdn.example/image.jpg' },
        },
      } as Partial<OrderItem>),
    )

    expect(
      wrapper
        .get('[data-testid="order-detail-product-image"]')
        .attributes('aria-hidden'),
    ).toBe('true')
  })
})

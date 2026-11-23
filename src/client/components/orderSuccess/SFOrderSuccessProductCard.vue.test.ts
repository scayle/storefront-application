import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockOrderItem } from '@test/mock-data/orders'
import SFOrderSuccessProductCard from './SFOrderSuccessProductCard.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const globalConfig = {
  mocks: { $t: (key: string) => key },
  stubs: {
    SFLink: {
      template: '<a data-testid="success-product-card"><slot /></a>',
      props: ['to'],
    },
    SFProductImage: true,
    SFProductPrice: true,
    SFLabelValue: true,
    SFBasketCardSubscriptionData: {
      name: 'SFBasketCardSubscriptionData',
      template: '<div data-testid="subscription-data"><slot /></div>',
      props: ['definition', 'subscription'],
    },
  },
}

const definition = {
  subscriptionInterval: 'P1M',
  subscriptionDeliveryDate: '1',
}

const subscription = { intervals: [{ label: 'Monthly', value: 'P1M' }] }

describe('SFOrderSuccessProductCard', () => {
  it('eager-loads the product image', () => {
    const wrapper = mount(SFOrderSuccessProductCard, {
      props: { item: createMockOrderItem() },
      global: {
        ...globalConfig,
        stubs: {
          ...globalConfig.stubs,
          SFProductImage: {
            props: ['imageLoading'],
            template:
              '<div data-testid="success-product-image" :data-loading="imageLoading" />',
          },
        },
      },
    })

    expect(
      wrapper
        .get('[data-testid="success-product-image"]')
        .attributes('data-loading'),
    ).toBe('eager')
  })

  it('renders the product name', () => {
    const wrapper = mount(SFOrderSuccessProductCard, {
      props: { item: createMockOrderItem() },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="success-product-name"]').text()).toBe(
      "Jacket 'Premium'",
    )
  })

  it('renders the brand', () => {
    const wrapper = mount(SFOrderSuccessProductCard, {
      props: { item: createMockOrderItem() },
      global: globalConfig,
    })

    expect(wrapper.get('[data-testid="success-product-brand"]').text()).toBe(
      'ADIDAS ORIGINALS',
    )
  })

  it('keeps the color, size and quantity test ids on the rendered label values', () => {
    const wrapper = mount(SFOrderSuccessProductCard, {
      props: { item: createMockOrderItem() },
      global: {
        ...globalConfig,
        stubs: { ...globalConfig.stubs, SFLabelValue: false },
      },
    })

    expect(wrapper.get('[data-testid="success-product-color"]').text()).toBe(
      'product_attribute.color: Black',
    )
    expect(wrapper.get('[data-testid="success-product-size"]').text()).toBe(
      'product_attribute.size: M',
    )
    expect(wrapper.get('[data-testid="success-product-quantity"]').text()).toBe(
      'global.quantity: 1',
    )
  })

  it('passes the stored definition and the variant subscription options to the subscription data', () => {
    const wrapper = mount(SFOrderSuccessProductCard, {
      props: {
        item: createMockOrderItem({
          subscriptionDefinition: definition,
          variant: { ...createMockOrderItem().variant, subscription },
        }),
      },
      global: globalConfig,
    })

    expect(
      wrapper.getComponent({ name: 'SFBasketCardSubscriptionData' }).props(),
    ).toEqual({ definition, subscription })
  })

  it('passes an undefined definition for a regular item', () => {
    const wrapper = mount(SFOrderSuccessProductCard, {
      props: { item: createMockOrderItem() },
      global: globalConfig,
    })

    expect(
      wrapper
        .getComponent({ name: 'SFBasketCardSubscriptionData' })
        .props('definition'),
    ).toBeUndefined()
  })

  it('names the link by its visible content instead of an aria-label', () => {
    const wrapper = mount(SFOrderSuccessProductCard, {
      props: { item: createMockOrderItem() },
      global: globalConfig,
    })

    expect(
      wrapper
        .find('[data-testid="success-product-card"]')
        .attributes('aria-label'),
    ).toBeUndefined()
  })

  it('hides the product image from assistive technology so the name is read once', () => {
    const wrapper = mount(SFOrderSuccessProductCard, {
      props: { item: createMockOrderItem() },
      global: globalConfig,
    })

    expect(
      wrapper
        .get('[data-testid="success-product-image-wrapper"]')
        .attributes('aria-hidden'),
    ).toBe('true')
  })
})

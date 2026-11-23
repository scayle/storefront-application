import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { t } from '@test/mocks/vue-i18n'
import SFOrderDetailProductDetails from './SFOrderDetailProductDetails.vue'

const globalConfig = {
  mocks: { $t: t },
}

describe('SFOrderDetailProductDetails', () => {
  it('renders each product detail in its own element', () => {
    const wrapper = mount(SFOrderDetailProductDetails, {
      props: {
        name: 'Sneaker',
        brand: 'Nike',
        size: 'M',
        color: 'Red',
        quantity: 1,
      },
      global: globalConfig,
    })

    const detail = (name: string) =>
      wrapper.get(`[data-testid="order-detail-product-${name}"]`).text()
    expect({
      brand: detail('brand'),
      name: detail('name'),
      color: detail('color'),
      size: detail('size'),
      quantity: detail('quantity'),
    }).toEqual({
      brand: 'Nike',
      name: 'Sneaker',
      color: 'account.order_detail.product.color: Red',
      size: 'account.order_detail.product.size: M',
      quantity: 'global.quantity: 1',
    })
  })

  it('hides color when not provided', () => {
    const wrapper = mount(SFOrderDetailProductDetails, {
      props: { name: 'Sneaker', size: 'M', quantity: 1 },
      global: globalConfig,
    })

    expect(
      wrapper.find('[data-testid="order-detail-product-color"]').exists(),
    ).toBe(false)
  })

  it('hides brand when not provided', () => {
    const wrapper = mount(SFOrderDetailProductDetails, {
      props: { name: 'Sneaker', size: 'M', quantity: 1 },
      global: globalConfig,
    })

    expect(
      wrapper.find('[data-testid="order-detail-product-brand"]').exists(),
    ).toBe(false)
  })
})

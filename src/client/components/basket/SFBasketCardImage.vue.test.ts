import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { createMockBasketItem } from '@test/mock-data/basket'
import { createMockListingProduct } from '@test/mock-data/products'
import { t } from '@test/mocks/vue-i18n'
import { SFLinkStub } from '@test/stubs/common'

import SFBasketCardImage from './SFBasketCardImage.vue'

const SFWishlistToggleStub = defineComponent({
  name: 'SFWishlistToggle',
  props: {
    product: {
      type: Object,
      required: true,
    },
    productListType: {
      type: String,
      required: true,
    },
  },
  template:
    '<button data-testid="basket-card-wishlist-toggle" type="button" />',
})

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

describe('SFBasketCardImage', () => {
  const globalStubs = {
    SFLink: SFLinkStub,
    SFProductImage: {
      props: ['imageLoading'],
      template:
        '<img data-testid="basket-card-product-image" :data-loading="imageLoading" />',
    },
    SFWishlistToggle: SFWishlistToggleStub,
  }

  it('shows the wishlist toggle by default', () => {
    const wrapper = mount(SFBasketCardImage, {
      props: {
        basketItem: createMockBasketItem(),
      },
      global: { stubs: globalStubs, mocks: { $t: t } },
    })

    expect(
      wrapper.find('[data-testid="basket-card-wishlist-toggle"]').exists(),
    ).toBe(true)
  })

  it('hides wishlist toggle when hideWishlistToggle is true', () => {
    const wrapper = mount(SFBasketCardImage, {
      props: {
        basketItem: createMockBasketItem(),
        hideWishlistToggle: true,
      },
      global: { stubs: globalStubs, mocks: { $t: t } },
    })

    expect(
      wrapper.find('[data-testid="basket-card-wishlist-toggle"]').exists(),
    ).toBe(false)
  })

  it('passes the basket product to the wishlist toggle', () => {
    const basketItem = createMockBasketItem({
      product: createMockListingProduct({ id: 9001 }),
    })

    const wrapper = mount(SFBasketCardImage, {
      props: { basketItem },
      global: { stubs: globalStubs, mocks: { $t: t } },
    })

    const toggle = wrapper.findComponent(SFWishlistToggleStub)
    expect(toggle.props('product')).toEqual(basketItem.product)
    // The basket card is the `basket` surface of `add_to_wishlist`.
    expect(toggle.props('productListType')).toBe('basket')
  })

  it('eager-loads the product image', () => {
    const wrapper = mount(SFBasketCardImage, {
      props: { basketItem: createMockBasketItem() },
      global: { stubs: globalStubs, mocks: { $t: t } },
    })

    expect(
      wrapper
        .get('[data-testid="basket-card-product-image"]')
        .attributes('data-loading'),
    ).toBe('eager')
  })
})

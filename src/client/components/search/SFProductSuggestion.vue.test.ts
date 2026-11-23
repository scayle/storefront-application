import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ListingProduct } from '@scayle/storefront/types'
import SFProductImage from '@client/components/product/SFProductImage.vue'
import { createMockListingProduct } from '@test/mock-data/products'
import { createMockProductSuggestion } from '@test/mock-data/search'
import SFProductSuggestion from './SFProductSuggestion.vue'

const SFLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to', 'raw', 'variant', 'target'],
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

describe('SFProductSuggestion', () => {
  const mountSuggestion = (product: ListingProduct) =>
    mount(SFProductSuggestion, {
      props: { suggestion: createMockProductSuggestion({ product }) },
      global: {
        stubs: { SFLink: SFLinkStub },
        mocks: { $t: (k: string) => k },
      },
    })

  it('renders brand and product name', () => {
    const wrapper = mountSuggestion(
      createMockListingProduct({ name: 'Test Sneaker', brand: 'Nike' }),
    )

    expect(wrapper.text()).toContain('Nike')
    expect(wrapper.text()).toContain('Test Sneaker')
  })

  it('links to the product', () => {
    const wrapper = mountSuggestion(
      createMockListingProduct({ link: '/p/test-sneaker-1' }),
    )

    expect(wrapper.get('a').attributes('href')).toBe('/p/test-sneaker-1')
  })

  it('shows the product price', () => {
    const product = createMockListingProduct()
    const wrapper = mountSuggestion(product)

    expect(wrapper.text()).toContain(product.price.finalPrice)
  })

  it('shows the first product image as the thumbnail', () => {
    const product = createMockListingProduct()
    const wrapper = mountSuggestion(product)

    expect(wrapper.getComponent(SFProductImage).props('url')).toBe(
      product.images[0]!.url,
    )
  })

  it('renders no thumbnail when the product has no images', () => {
    const wrapper = mountSuggestion(createMockListingProduct({ images: [] }))

    expect(wrapper.findComponent(SFProductImage).exists()).toBe(false)
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMockListingProduct } from '@test/mock-data/products'
import SFProductCardSiblingsPicker from './SFProductCardSiblingsPicker.vue'

const stubs = {
  SFLink: { template: '<a><slot /></a>' },
  SFProductImage: { props: ['url'], template: '<img :src="url">' },
}

describe('SFProductCardSiblingsPicker swatch images', () => {
  it('shows the current product and its first two in-stock siblings as swatches', () => {
    const product = createMockListingProduct()
    const [sibling] = product.siblings!
    const siblingWithImage = (id: number, isSoldOut: boolean) => ({
      ...sibling!,
      id,
      isSoldOut,
      image: { ...sibling!.image!, url: `sibling-${id}.avif` },
    })
    const wrapper = mount(SFProductCardSiblingsPicker, {
      props: {
        product,
        siblings: [
          siblingWithImage(2, false),
          siblingWithImage(3, true),
          siblingWithImage(4, false),
          siblingWithImage(5, false),
        ],
        productLink: product.link,
      },
      global: { stubs },
    })

    expect(wrapper.findAll('img').map((img) => img.attributes('src'))).toEqual([
      product.images[0]!.url,
      'sibling-2.avif',
      'sibling-4.avif',
    ])
  })

  it('forwards the current product image url directly', () => {
    const product = createMockListingProduct()
    const wrapper = mount(SFProductCardSiblingsPicker, {
      props: {
        product,
        siblings: [],
        productLink: product.link,
      },
      global: { stubs },
    })

    expect(wrapper.get('img').attributes('src')).toBe(product.images[0]?.url)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { ProductImage } from '@scayle/storefront/types'
import SFProductCardImageSlider from './SFProductCardImageSlider.vue'

const image = (path: string): ProductImage => ({
  url: `https://cdn.example.com${path}`,
  name: `${path}.jpg`,
  applyPadding: false,
})

const images = [image('/product-1.avif'), image('/product-2.avif')]

// SFImageStrip renders its `#slide` scoped slot per image; the stub renders it
// once (index 0) so the slide markup (the product link) is asserted directly.
const stubs = {
  SFImageStrip: defineComponent({
    name: 'SFImageStrip',
    props: { images: { type: Array, default: () => [] } },
    template: `<div><slot name="slide" :image="images[0]" :index="0" /></div>`,
  }),
  SFLink: { template: '<a><slot /></a>' },
  SFProductImage: true,
}

function mountSlider() {
  return mount(SFProductCardImageSlider, {
    props: {
      link: '/products/jacket-premium-black',
      isProductHovered: false,
      images,
      alt: 'ADIDAS ORIGINALS Jacket',
    },
    global: { stubs },
  })
}

describe('image urls', () => {
  it('renders a slide with its own image url for each product image', () => {
    const wrapper = mount(SFProductCardImageSlider, {
      props: {
        link: '/products/jacket-premium-black',
        isProductHovered: false,
        images,
        alt: 'ADIDAS ORIGINALS Jacket',
      },
      global: {
        stubs: {
          SFImageStrip: defineComponent({
            name: 'SFImageStrip',
            props: { images: { type: Array, default: () => [] } },
            template: `<div><template v-for="(img, i) in images" :key="i"><slot name="slide" :image="img" :index="i" /></template></div>`,
          }),
          SFLink: { template: '<a><slot /></a>' },
          SFProductImage: { props: ['url'], template: '<img :src="url">' },
        },
      },
    })

    expect(wrapper.findAll('img').map((img) => img.attributes('src'))).toEqual(
      images.map((image) => image.url),
    )
  })
})

describe('SFProductCardImageSlider link accessibility', () => {
  it('hides each slide link from the a11y tree and the tab order', () => {
    const link = mountSlider().get(
      '[data-testid="product-card-image-slider-link"]',
    )

    // Redundant duplicate of the card's title link: aria-hidden removes it from
    // the accessibility tree, tabindex="-1" removes it from the tab order. The
    // slider itself stays operable via its arrow keys.
    expect(link.attributes('aria-hidden')).toBe('true')
    expect(link.attributes('tabindex')).toBe('-1')
  })
})

describe('image view switch', () => {
  // The strip snaps its slides and keys them by URL. Scrolling before Vue
  // moves the slides lets the browser re-snap to the previously shown slide at
  // its new position, so the reset has to run against the reordered DOM.
  it('scrolls back to the first image once the slides are in the new order', async () => {
    let firstSlideAtScroll: string | undefined
    const scrollImageIntoView = vi.fn()
    const wrapper = mount(SFProductCardImageSlider, {
      props: {
        link: '/products/jacket-premium-black',
        isProductHovered: false,
        images,
        alt: 'ADIDAS ORIGINALS Jacket',
      },
      global: {
        stubs: {
          ...stubs,
          SFImageStrip: defineComponent({
            name: 'SFImageStrip',
            props: { images: { type: Array, default: () => [] } },
            setup(_, { expose }) {
              expose({ scrollImageIntoView })
            },
            template:
              '<div><span v-for="image in images" :key="image.url" data-testid="slide" :data-url="image.url" /></div>',
          }),
        },
      },
    })
    scrollImageIntoView.mockImplementation(() => {
      firstSlideAtScroll = wrapper
        .find('[data-testid="slide"]')
        .attributes('data-url')
    })

    const reordered = images.toReversed()
    await wrapper.setProps({ images: reordered })

    expect(scrollImageIntoView).toHaveBeenCalledWith(0, 'instant')
    expect(firstSlideAtScroll).toBe(reordered[0]!.url)
  })
})

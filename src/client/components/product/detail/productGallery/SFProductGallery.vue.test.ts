import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildImageVariant } from '@scayle/storefront/shared'
import { createMockDetailedProduct } from '@test/mock-data/products'
import { IMAGE_VARIANTS } from '@shared/constants/imageVariants'
import {
  buildGalleryTilePresets,
  GALLERY_ZOOM_PRESET,
} from '@shared/utils/productGalleryMedia'
import SFProductGallery from './SFProductGallery.vue'

const isDesktopGrid = ref(true)

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return `${key}(${JSON.stringify(params)})`
      }
      return key
    },
  }),
}))

vi.mock('@client/composables/useDefaultBreakpoints', () => ({
  useDefaultBreakpoints: () => ({
    greaterOrEqual: () => isDesktopGrid,
  }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Head: defineComponent({
    setup(_, { slots }) {
      return () =>
        h('div', { 'data-testid': 'inertia-head' }, slots.default?.())
    },
  }),
}))

const stubs = {
  SFImageGallery: defineComponent({
    name: 'SFImageGallery',
    props: ['images', 'withArrows'],
    emits: ['slideClick', 'update:activeSlide'],
    template: `<div data-testid="image-gallery" :data-with-arrows="String(withArrows)">
      <button data-testid="slider-open" @click="$emit('slideClick', 1)"></button>
      <button data-testid="slider-activate-video" @click="$emit('slideClick', 1)"></button>
      <template v-for="(img, i) in images" :key="i">
        <slot name="slide" :image="img" :index="i" :isActive="i === 0" />
      </template>
    </div>`,
  }),
  SFProductImageGrid: {
    props: ['items', 'productName', 'playingVideoIndex'],
    emits: ['enlarge', 'playVideo'],
    template:
      '<ul data-testid="image-grid" :data-product-name="productName" :data-playing-video-index="playingVideoIndex"><template v-for="(item, i) in items" :key="i"><li data-testid="grid-image" :data-url="item.url"></li></template><li><button data-testid="grid-enlarge" @click="$emit(\'enlarge\', 1)"></button><button data-testid="grid-enlarge-after-video" @click="$emit(\'enlarge\', 2)"></button><button data-testid="grid-play-video" @click="$emit(\'playVideo\', 1)"></button></li></ul>',
  },
  SFProductGalleryZoom: {
    props: ['visible', 'currentSlideIndex', 'items'],
    template:
      '<div data-testid="zoom" :data-visible="String(visible)" :data-index="currentSlideIndex" :data-types="(items || []).map((item) => item.type).join(\',\')"></div>',
  },
  SFProductVideoSlide: defineComponent({
    name: 'SFProductVideoSlide',
    props: ['url', 'posterUrl', 'alt', 'isPlaying'],
    template:
      '<div data-testid="slider-video" :data-url="url" :data-playing="String(isPlaying)" @click="$emit(\'play\')"></div>',
  }),
  SFProductImage: defineComponent({
    name: 'SFProductImage',
    props: ['url', 'preset', 'alt'],
    template:
      '<img data-testid="gallery-image" :data-url="url" :data-preset="preset" :alt="alt">',
  }),
  SFBackButton: { template: '<div />' },
  SFWishlistToggle: { template: '<div />' },
  SFProductBadges: { template: '<div />' },
}

const mountGallery = (product = createMockDetailedProduct()) =>
  mount(SFProductGallery, {
    props: { product },
    global: { stubs, mocks: { $t: (k: string) => k } },
  })

const productWithVideo = () =>
  createMockDetailedProduct({
    videos: [
      {
        url: 'https://cdn.example.com/hero.mp4',
        posterUrl: 'https://cdn.example.com/hero.jpg',
      },
    ],
  })

describe('SFProductGallery', () => {
  beforeEach(() => {
    isDesktopGrid.value = true
  })

  it('preloads the first gallery image in the document head when it is an image', () => {
    const product = createMockDetailedProduct()
    const wrapper = mountGallery(product)
    const [preset] = buildGalleryTilePresets(product.images.length)
    const expected = buildImageVariant(
      product.images[0]!.url,
      IMAGE_VARIANTS[preset!],
    )

    const link = wrapper.get('[data-testid="inertia-head"]').get('link')
    expect(link.attributes('rel')).toBe('preload')
    expect(link.attributes('as')).toBe('image')
    expect(link.attributes('href')).toBe(expected.src)
    expect(link.attributes('imagesrcset')).toBe(expected.srcSet)
    expect(link.attributes('imagesizes')).toBe(expected.sizes)
    expect(link.attributes('fetchpriority')).toBe('high')
  })

  it('does not preload when the first gallery item is a video', () => {
    const wrapper = mountGallery(
      createMockDetailedProduct({
        images: [],
        videos: [{ url: 'https://cdn.example.com/hero.mp4' }],
      }),
    )

    expect(wrapper.find('[data-testid="inertia-head"]').exists()).toBe(false)
  })

  it('passes the mobile slider images with their grid tile preset', () => {
    const product = createMockDetailedProduct()
    const wrapper = mountGallery(product)

    const galleryImages = wrapper.findAll('[data-testid="gallery-image"]')
    expect(galleryImages).toHaveLength(product.images.length)

    for (const [index, img] of galleryImages.entries()) {
      expect(img.attributes('data-url')).toBe(product.images[index]!.url)
      // Two images share the top grid row, so both get the half-width preset.
      expect(img.attributes('data-preset')).toBe('galleryHalf')
    }
  })

  it('passes every product image and the product name to the grid', () => {
    const product = createMockDetailedProduct()
    const wrapper = mountGallery(product)

    const grid = wrapper.find('[data-testid="image-grid"]')
    expect(grid.attributes('data-product-name')).toBe(product.name)

    const tiles = wrapper.findAll('[data-testid="grid-image"]')
    expect(tiles).toHaveLength(product.images.length)
    for (const [index, tile] of tiles.entries()) {
      expect(tile.attributes('data-url')).toBe(product.images[index]!.url)
    }
  })

  it('opens the zoom at the clicked grid tile index', async () => {
    const wrapper = mountGallery()

    await wrapper.find('[data-testid="grid-enlarge"]').trigger('click')
    await wrapper.vm.$nextTick()

    const zoom = wrapper.find('[data-testid="zoom"]')
    expect(zoom.attributes('data-visible')).toBe('true')
    expect(zoom.attributes('data-index')).toBe('1')
  })

  describe('zoom image preload', () => {
    const zoomPreloadLinks = (wrapper: ReturnType<typeof mountGallery>) =>
      wrapper
        .get('[data-testid="inertia-head"]')
        .findAll('link[fetchpriority="low"]')

    it("preloads the zoom image of every gallery image at low priority with the zoom view's srcset and sizes", () => {
      const product = createMockDetailedProduct()

      const links = zoomPreloadLinks(mountGallery(product))

      expect(
        links.map((link) => ({
          rel: link.attributes('rel'),
          as: link.attributes('as'),
          href: link.attributes('href'),
          imagesrcset: link.attributes('imagesrcset'),
          imagesizes: link.attributes('imagesizes'),
        })),
      ).toEqual(
        product.images.map((image) => {
          const { src, srcSet, sizes } = buildImageVariant(
            image.url,
            IMAGE_VARIANTS[GALLERY_ZOOM_PRESET],
          )
          return {
            rel: 'preload',
            as: 'image',
            href: src,
            imagesrcset: srcSet,
            imagesizes: sizes,
          }
        }),
      )
    })

    it('limits every zoom image preload but the first to viewports from 1024px up', () => {
      const links = zoomPreloadLinks(mountGallery())

      expect(links.map((link) => link.element.hasAttribute('media'))).toEqual([
        false,
        true,
      ])
      expect(links[1]!.attributes('media')).toBe('(min-width: 1024px)')
    })

    it('preloads no zoom image for a video', () => {
      const product = productWithVideo()

      const links = zoomPreloadLinks(mountGallery(product))

      expect(links).toHaveLength(product.images.length)
    })
  })

  it.for([
    {
      name: 'autoplays the first video on the desktop grid',
      isDesktop: true,
      product: productWithVideo,
      playingVideoIndex: '1',
    },
    {
      name: 'does not seed a playing video on the hidden desktop grid when the layout is mobile',
      isDesktop: false,
      product: productWithVideo,
      playingVideoIndex: undefined,
    },
    {
      name: 'does not set a playing video when the product has none',
      isDesktop: true,
      product: () => createMockDetailedProduct(),
      playingVideoIndex: undefined,
    },
  ])('$name', ({ isDesktop, product, playingVideoIndex }) => {
    isDesktopGrid.value = isDesktop
    const wrapper = mountGallery(product())

    expect(
      wrapper
        .get('[data-testid="image-grid"]')
        .attributes('data-playing-video-index'),
    ).toBe(playingVideoIndex)
  })

  it('opens the zoom at the tapped mobile slide index', async () => {
    const wrapper = mountGallery()

    await wrapper.find('[data-testid="slider-open"]').trigger('click')

    const zoom = wrapper.find('[data-testid="zoom"]')
    expect(zoom.attributes('data-visible')).toBe('true')
    expect(zoom.attributes('data-index')).toBe('1')
  })

  it('renders the mobile slider arrows on a device without touch input', async () => {
    const wrapper = mountGallery()
    await wrapper.vm.$nextTick()

    expect(
      wrapper
        .find('[data-testid="main-product-image"]')
        .attributes('data-with-arrows'),
    ).toBe('true')
  })

  // A tap's compatibility hover would reveal them, and iOS Safari then drops the click.
  it('leaves out the mobile slider arrows on a touch device', async () => {
    vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(5)
    const wrapper = mountGallery()
    await wrapper.vm.$nextTick()

    expect(
      wrapper
        .find('[data-testid="main-product-image"]')
        .attributes('data-with-arrows'),
    ).toBe('false')
  })

  it('does not mount the zoom component until zoom is opened', () => {
    const product = createMockDetailedProduct()
    const wrapper = mount(SFProductGallery, {
      props: { product },
      global: { stubs },
    })

    expect(wrapper.find('[data-testid="zoom"]').exists()).toBe(false)
  })

  it('passes the mixed media list to zoom', async () => {
    const wrapper = mountGallery(productWithVideo())

    await wrapper
      .find('[data-testid="grid-enlarge-after-video"]')
      .trigger('click')

    expect(wrapper.find('[data-testid="zoom"]').attributes('data-types')).toBe(
      'image,video,image',
    )
  })

  it('opens the zoom at the media index of the image after the video', async () => {
    const wrapper = mountGallery(productWithVideo())

    await wrapper
      .find('[data-testid="grid-enlarge-after-video"]')
      .trigger('click')

    const zoom = wrapper.find('[data-testid="zoom"]')
    expect(zoom.attributes('data-visible')).toBe('true')
    expect(zoom.attributes('data-index')).toBe('2')
  })

  it('pauses the playing grid video when zoom opens', async () => {
    const wrapper = mountGallery(productWithVideo())

    await wrapper.find('[data-testid="grid-play-video"]').trigger('click')
    expect(
      wrapper
        .find('[data-testid="image-grid"]')
        .attributes('data-playing-video-index'),
    ).toBe('1')

    await wrapper
      .find('[data-testid="grid-enlarge-after-video"]')
      .trigger('click')

    expect(
      wrapper
        .find('[data-testid="image-grid"]')
        .attributes('data-playing-video-index'),
    ).toBeUndefined()
    expect(
      wrapper.find('[data-testid="zoom"]').attributes('data-visible'),
    ).toBe('true')
  })

  it('plays the video in place instead of opening zoom when a video slide is activated', async () => {
    const wrapper = mountGallery(productWithVideo())

    await wrapper.find('[data-testid="slider-activate-video"]').trigger('click')

    expect(
      wrapper
        .find('[data-testid="image-grid"]')
        .attributes('data-playing-video-index'),
    ).toBe('1')
  })

  it.for([
    {
      name: 'marks the first mobile slide as playing when it is a video',
      isDesktop: false,
      isPlaying: 'true',
    },
    {
      name: 'does not play the mobile slide video while the desktop grid is visible',
      isDesktop: true,
      isPlaying: 'false',
    },
  ])('$name', ({ isDesktop, isPlaying }) => {
    isDesktopGrid.value = isDesktop
    const wrapper = mountGallery(
      createMockDetailedProduct({
        images: [],
        videos: [{ url: 'https://cdn.example.com/hero.mp4' }],
      }),
    )

    expect(
      wrapper.get('[data-testid="slider-video"]').attributes('data-playing'),
    ).toBe(isPlaying)
  })
})

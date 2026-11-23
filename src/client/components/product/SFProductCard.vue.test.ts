import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import type {
  ListingProduct,
  ProductImage,
  Promotion,
} from '@scayle/storefront/types'
import { createMockListingProduct } from '@test/mock-data/products'
import { createMockPromotion } from '@test/mock-data/promotions'
import SFProductCard from './SFProductCard.vue'

const highlightPromotion = createMockPromotion({
  highlightProductCards: true,
  product: {
    attributeGroupId: 100,
    attributeId: 200,
    badgeLabel: '3xDress = 99,99 €',
  },
})

const pageProps = ref<{ promotions: Promotion[]; campaign: null }>({
  promotions: [],
  campaign: null,
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: pageProps.value }),
}))

// Force the card to be considered visible so `hasSiblings` reflects the
// product data rather than the (mocked) viewport intersection. `useMounted`
// is left real by default so unrelated tests mount with `isMounted` already
// `true`, matching what @vue/test-utils' synchronous `mount()` would do
// anyway; the mount-timing test below overrides it to observe the pre-mount
// state.
const isMountedOverride = ref<boolean | undefined>(undefined)

// The tile impression observes with a `threshold`, the lazy mounting does not.
const tileVisibility = ref(false)

vi.mock('@vueuse/core', async () => {
  const actual =
    await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')
  return {
    ...actual,
    useElementVisibility: (
      _target: unknown,
      options?: { threshold?: number },
    ) => {
      return options?.threshold ? tileVisibility : ref(true)
    },
    useMounted: () =>
      isMountedOverride.value === undefined
        ? actual.useMounted()
        : isMountedOverride,
  }
})

function getDesktopSiblingsOverlay(wrapper: ReturnType<typeof mountCard>) {
  return wrapper.get('[data-testid="siblings-overlay"]').element
}

const stubs = {
  // SFLink wraps the brand/name block, so its default slot must render.
  SFLink: { template: '<a><slot /></a>' },
  SFWishlistToggle: true,
  SFProductBadges: true,
  SFProductCardImageSlider: defineComponent({
    name: 'SFProductCardImageSlider',
    props: ['images'],
    emits: ['activeSlideChange', 'selectProduct'],
    setup(_, { expose }) {
      expose({
        scrollImageIntoView: vi.fn(),
      })
    },
    template: '<div data-testid="product-image-slider" />',
  }),
  SFProductCardSiblingsPicker: {
    template: '<div data-testid="product-siblings-picker" />',
  },
  SFProductCardInBasketBadge: true,
  SFProductPrice: true,
  SFBadges: true,
  SFHighlightFooter: defineComponent({
    name: 'SFHighlightFooter',
    template: '<div data-testid="highlight-footer" />',
  }),
  SFProductImage: true,
}

function mountCard(product: ListingProduct) {
  return mount(SFProductCard, {
    props: { product, productIndex: 0, productListType: 'category' },
    global: { stubs },
  })
}

describe('SFProductCard siblings hover', () => {
  afterEach(() => {
    pageProps.value = { promotions: [], campaign: null }
  })

  it('renders the siblings picker in an inert, hidden overlay before the card is hovered', () => {
    const wrapper = mountCard(createMockListingProduct())
    const imageOverlay = getDesktopSiblingsOverlay(wrapper)

    expect(
      imageOverlay.querySelector('[data-testid="product-siblings-picker"]'),
    ).not.toBeNull()
    expect(imageOverlay.hasAttribute('inert')).toBe(true)
    expect(imageOverlay.getAttribute('aria-hidden')).toBe('true')
  })

  it('makes the desktop siblings overlay focusable when the card is hovered', async () => {
    const wrapper = mountCard(createMockListingProduct())
    const imageOverlay = getDesktopSiblingsOverlay(wrapper)

    await wrapper.trigger('mouseenter')

    expect(imageOverlay.hasAttribute('inert')).toBe(false)
    expect(imageOverlay.getAttribute('aria-hidden')).toBe('false')
  })

  it('hides siblings overlay when the image slide changes', async () => {
    const wrapper = mountCard(createMockListingProduct())
    const imageOverlay = getDesktopSiblingsOverlay(wrapper)
    const slider = wrapper.findComponent({ name: 'SFProductCardImageSlider' })

    await wrapper.trigger('mouseenter')
    expect(imageOverlay.hasAttribute('inert')).toBe(false)

    slider.vm.$emit('activeSlideChange', 1)
    await wrapper.vm.$nextTick()

    expect(imageOverlay.hasAttribute('inert')).toBe(true)
    expect(imageOverlay.getAttribute('aria-hidden')).toBe('true')
  })

  it('hides the desktop siblings overlay after the pointer leaves the card', async () => {
    const wrapper = mountCard(createMockListingProduct())
    const imageOverlay = getDesktopSiblingsOverlay(wrapper)
    const outsideElement = document.createElement('div')
    document.body.appendChild(outsideElement)

    try {
      await wrapper.trigger('mouseenter')
      await wrapper.trigger('mouseleave', { relatedTarget: outsideElement })
      await wrapper.vm.$nextTick()

      expect(imageOverlay.hasAttribute('inert')).toBe(true)
      expect(imageOverlay.getAttribute('aria-hidden')).toBe('true')
    } finally {
      outsideElement.remove()
    }
  })

  it('reveals the desktop siblings overlay when focus enters the card', async () => {
    const wrapper = mountCard(createMockListingProduct())
    const imageOverlay = getDesktopSiblingsOverlay(wrapper)

    await wrapper.trigger('focusin')

    expect(imageOverlay.hasAttribute('inert')).toBe(false)
    expect(imageOverlay.getAttribute('aria-hidden')).toBe('false')
  })

  it('hides the desktop siblings overlay when focus leaves the card', async () => {
    const wrapper = mountCard(createMockListingProduct())
    const imageOverlay = getDesktopSiblingsOverlay(wrapper)
    const outsideElement = document.createElement('button')
    document.body.appendChild(outsideElement)

    try {
      await wrapper.trigger('focusin')
      await wrapper.trigger('focusout', { relatedTarget: outsideElement })

      expect(imageOverlay.hasAttribute('inert')).toBe(true)
      expect(imageOverlay.getAttribute('aria-hidden')).toBe('true')
    } finally {
      outsideElement.remove()
    }
  })

  it('keeps the desktop siblings overlay open while focus moves inside the card', async () => {
    const wrapper = mountCard(createMockListingProduct())
    const imageOverlay = getDesktopSiblingsOverlay(wrapper)

    await wrapper.trigger('focusin')
    await wrapper.trigger('focusout', { relatedTarget: imageOverlay })

    expect(imageOverlay.hasAttribute('inert')).toBe(false)
    expect(imageOverlay.getAttribute('aria-hidden')).toBe('false')
  })

  it('keeps the desktop siblings overlay open when the pointer leaves while focus is inside', async () => {
    const wrapper = mountCard(createMockListingProduct())
    const imageOverlay = getDesktopSiblingsOverlay(wrapper)

    await wrapper.trigger('mouseenter')
    await wrapper.trigger('focusin')
    await wrapper.trigger('mouseleave')

    expect(imageOverlay.hasAttribute('inert')).toBe(false)
    expect(imageOverlay.getAttribute('aria-hidden')).toBe('false')
  })

  it('keeps the desktop siblings overlay open when focus leaves while the pointer is inside', async () => {
    const wrapper = mountCard(createMockListingProduct())
    const imageOverlay = getDesktopSiblingsOverlay(wrapper)

    await wrapper.trigger('mouseenter')
    await wrapper.trigger('focusin')
    await wrapper.trigger('focusout')

    expect(imageOverlay.hasAttribute('inert')).toBe(false)
    expect(imageOverlay.getAttribute('aria-hidden')).toBe('false')
  })

  it('does not render siblings on hover when the product has none', async () => {
    const wrapper = mountCard(createMockListingProduct({ siblings: [] }))

    await wrapper.trigger('mouseenter')

    expect(
      wrapper.find('[data-testid="product-siblings-picker"]').exists(),
    ).toBe(false)
  })
})

describe('SFProductCard image link accessibility', () => {
  // A product with a single image renders the static image link (no slider).
  const singleImageProduct = () => {
    const base = createMockListingProduct()
    return createMockListingProduct({ images: base.images.slice(0, 1) })
  }

  it('removes the redundant single-image link from the a11y tree and tab order', () => {
    const wrapper = mountCard(singleImageProduct())

    const imageLink = wrapper
      .getComponent({ name: 'SFProductImage' })
      .element.closest('a')

    // aria-hidden drops the nameless duplicate link from the accessibility
    // tree; tabindex="-1" drops the redundant tab stop.
    expect(imageLink?.getAttribute('aria-hidden')).toBe('true')
    expect(imageLink?.getAttribute('tabindex')).toBe('-1')
  })

  it('keeps the title link exposed as the single named link', () => {
    const wrapper = mountCard(singleImageProduct())

    const titleLink = wrapper
      .get('[data-testid="product-card-product-name"]')
      .element.closest('a')

    expect(titleLink?.getAttribute('aria-hidden')).toBeNull()
  })
})

describe('SFProductCard highlight promotion override', () => {
  afterEach(() => {
    pageProps.value = { promotions: [], campaign: null }
  })

  it('applies the highlighted-deal treatment from the direct override even with no page promotions', () => {
    const wrapper = mount(SFProductCard, {
      props: {
        product: createMockListingProduct({
          siblings: [],
          attributeValuesByGroup: {},
        }),
        productIndex: 0,
        productListType: 'category',
        highlightOverride: {
          color: { backgroundColor: '#e3000b', color: '#ffffff' },
          badgeLabel: '3xDress = 99,99 €',
          countdownEndDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        },
      },
      global: { stubs },
    })

    // Footer bar renders and the override flows through to the badge stack.
    expect(wrapper.findComponent({ name: 'SFHighlightFooter' }).exists()).toBe(
      true,
    )
    expect(
      wrapper.findComponent({ name: 'SFBadges' }).props('highlightBadgeStyle'),
    ).toEqual({ backgroundColor: '#e3000b', color: '#ffffff' })
  })

  it('renders no highlight footer without an override or matching promotion', () => {
    const wrapper = mountCard(
      createMockListingProduct({ siblings: [], attributeValuesByGroup: {} }),
    )

    expect(wrapper.findComponent({ name: 'SFHighlightFooter' }).exists()).toBe(
      false,
    )
  })

  it('hides the highlight footer when no countdown is provided in override', () => {
    const wrapper = mount(SFProductCard, {
      props: {
        product: createMockListingProduct({
          siblings: [],
          attributeValuesByGroup: {},
        }),
        productIndex: 0,
        productListType: 'category',
        highlightOverride: {
          color: { backgroundColor: '#e3000b', color: '#ffffff' },
        },
      },
      global: { stubs },
    })

    expect(wrapper.findComponent({ name: 'SFHighlightFooter' }).exists()).toBe(
      false,
    )
  })

  it('hides the default highlight badge when override has no badge label', () => {
    const wrapper = mount(SFProductCard, {
      props: {
        product: createMockListingProduct({
          siblings: [],
          attributeValuesByGroup: {},
        }),
        productIndex: 0,
        productListType: 'category',
        highlightOverride: {
          color: { backgroundColor: '#e3000b', color: '#ffffff' },
        },
      },
      global: { stubs },
    })

    expect(
      wrapper
        .findComponent({ name: 'SFBadges' })
        .props('hideDefaultHighlightBadge'),
    ).toBe(true)
  })
})

describe('SFProductCard promotions mount timing', () => {
  afterEach(() => {
    isMountedOverride.value = undefined
    pageProps.value = { promotions: [], campaign: null }
  })

  it('renders no promotions before mount, matching the empty SSR output', () => {
    pageProps.value.promotions = [highlightPromotion]
    isMountedOverride.value = false

    const wrapper = mountCard(
      createMockListingProduct({ attributeValuesByGroup: { '100': [200] } }),
    )

    expect(wrapper.findComponent({ name: 'SFBadges' }).exists()).toBe(false)
  })

  it('reveals the deferred promotions once mounted', () => {
    pageProps.value.promotions = [highlightPromotion]
    isMountedOverride.value = true

    const wrapper = mountCard(
      createMockListingProduct({ attributeValuesByGroup: { '100': [200] } }),
    )

    expect(
      wrapper.findComponent({ name: 'SFBadges' }).props('promotions'),
    ).toEqual([highlightPromotion])
  })
})

describe('SFProductCard wishlist toggle', () => {
  it('passes the 1-based list position for the zero-based productIndex', () => {
    const toggle = mountCard(createMockListingProduct()).findComponent({
      name: 'SFWishlistToggle',
    })

    expect(toggle.props('index')).toBe(1)
  })
})

describe('SFProductCard image priority', () => {
  // A product with a single image renders the static image, not the slider.
  const singleImageProduct = () => {
    const base = createMockListingProduct()
    return createMockListingProduct({ images: base.images.slice(0, 1) })
  }

  it('passes the consumer-supplied fetchPriority to the image', () => {
    const image = mount(SFProductCard, {
      props: {
        product: singleImageProduct(),
        productListType: 'category',
        fetchPriority: 'high',
      },
      global: { stubs },
    }).findComponent({ name: 'SFProductImage' })

    expect(image.props('fetchPriority')).toBe('high')
  })
})

describe('SFProductCard image view', () => {
  const typedImage = (path: string, imageType?: string): ProductImage => ({
    url: `https://cdn.example.com${path}`,
    name: `${path}.jpg`,
    applyPadding: false,
    imageType,
  })

  const product = createMockListingProduct({
    images: [
      typedImage('/front.avif'),
      typedImage('/type-a-1.avif', 'type-a'),
      typedImage('/type-a-2.avif', 'type-a'),
    ],
  })

  const mountWithImageType = (
    imageType: string | undefined,
    disableImageSlider = false,
  ) =>
    mount(SFProductCard, {
      props: {
        product,
        productListType: 'category',
        imageType,
        disableImageSlider,
      },
      global: { stubs },
    })

  it('shows the first image of the selected type as the still card image', () => {
    const wrapper = mountWithImageType('type-a', true)

    expect(wrapper.getComponent({ name: 'SFProductImage' }).props('url')).toBe(
      'https://cdn.example.com/type-a-1.avif',
    )
  })

  it('shows the first Panel image when no image view is selected', () => {
    const wrapper = mountWithImageType(undefined, true)

    expect(wrapper.getComponent({ name: 'SFProductImage' }).props('url')).toBe(
      'https://cdn.example.com/front.avif',
    )
  })

  it('passes the slider the images in the order of the selected view', () => {
    const slider = mountWithImageType('type-a').getComponent({
      name: 'SFProductCardImageSlider',
    })

    const images: ProductImage[] = slider.props('images')
    expect(images.map((image) => image.url)).toEqual([
      'https://cdn.example.com/type-a-1.avif',
      'https://cdn.example.com/type-a-2.avif',
      'https://cdn.example.com/front.avif',
    ])
  })
})

describe('SFProductCard tile impression', () => {
  afterEach(() => {
    tileVisibility.value = false
  })

  it('reports the impression only once half of the card is on screen', async () => {
    const product = createMockListingProduct()
    const wrapper = mountCard(product)

    expect(wrapper.emitted('intersectProduct')).toBeUndefined()

    tileVisibility.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('intersectProduct')).toEqual([[product.id]])
  })
})

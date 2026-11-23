import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListingProduct } from '@scayle/storefront/types'
import { createMockBasketItem } from '@test/mock-data/basket'
import { createMockListingProduct } from '@test/mock-data/products'
import { useAddToBasketSlideIn } from '@client/composables/useAddToBasketSlideIn'
import SFAddToBasketSlideIn from './SFAddToBasketSlideIn.vue'

const mocks = vi.hoisted(() => ({
  isDesktop: true,
  pageProps: {} as { trendingProducts?: ListingProduct[] },
}))

vi.mock('@client/composables/usePage', () => ({
  usePage: () => ({ props: mocks.pageProps }),
}))

vi.mock('@client/composables/useDefaultBreakpoints', async () => {
  const { computed } = await import('vue')
  return {
    useDefaultBreakpoints: () => ({
      greaterOrEqual: () => computed(() => mocks.isDesktop),
    }),
  }
})

// Renders both slots so a test can tell which one the summary was mounted in.
const stubs = {
  SFSlideIn: {
    props: ['labelledBy'],
    template:
      '<div role="dialog" :aria-labelledby="labelledBy"><header data-testid="slide-in-header"><slot name="header" :close="() => {}" /></header><slot /></div>',
  },
  SFAddToBasketSlideInSummary: {
    props: ['item'],
    template: '<div data-testid="summary" :data-item-key="item.key" />',
  },
  SFAddToBasketSlideInRecommendations: {
    props: ['products'],
    template:
      '<div data-testid="recommendations" :data-count="products.length" />',
  },
}

const addedItem = createMockBasketItem({ key: 'item-key' })

const mountSlideIn = () =>
  mount(SFAddToBasketSlideIn, {
    global: { stubs, mocks: { $t: (key: string) => key } },
  })

describe('SFAddToBasketSlideIn', () => {
  beforeEach(() => {
    mocks.isDesktop = true
    mocks.pageProps = {}
    useAddToBasketSlideIn().open(addedItem)
  })

  afterEach(() => {
    useAddToBasketSlideIn().close()
  })

  // The open flag lives at module scope but the panel does not: navigating to a
  // page on `SimpleLayout` tears down the layout that mounts it. Left `true`
  // with nothing rendering it, the next `open()` writes a value it already
  // holds and the panel never comes back for the rest of the session.
  it('clears the open state when the layout tears it down', () => {
    const wrapper = mountSlideIn()
    expect(useAddToBasketSlideIn().isOpen.value).toBe(true)

    wrapper.unmount()

    expect(useAddToBasketSlideIn().isOpen.value).toBe(false)
  })

  it('keeps the added line and CTAs in the sticky header on desktop', () => {
    const wrapper = mountSlideIn()

    const header = wrapper.get('[data-testid="slide-in-header"]')
    expect(
      header.get('[data-testid="summary"]').attributes('data-item-key'),
    ).toBe('item-key')
    // One instance only — the body must not repeat it.
    expect(wrapper.findAll('[data-testid="summary"]')).toHaveLength(1)
  })

  it('scrolls the line item and CTAs with the sheet on mobile', () => {
    mocks.isDesktop = false

    const wrapper = mountSlideIn()

    const header = wrapper.get('[data-testid="slide-in-header"]')
    expect(header.find('[data-testid="summary"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="summary"]')).toHaveLength(1)
  })

  // The recommendations are the current page's `trendingProducts`. Every page
  // that does not send them renders no section at all, which is what keeps an
  // add started off the product detail page from showing another page's.
  it('renders the current page trending products as recommendations', () => {
    mocks.pageProps = {
      trendingProducts: [
        createMockListingProduct({ id: 1 }),
        createMockListingProduct({ id: 2 }),
      ],
    }

    expect(
      mountSlideIn()
        .get('[data-testid="recommendations"]')
        .attributes('data-count'),
    ).toBe('2')
  })

  // The recommendations report their list once per mount, and the panel stays
  // mounted while closed so its exit transition has content to slide out.
  // Each open therefore remounts them, which reports the list again.
  it('remounts the recommendations on every open', async () => {
    mocks.pageProps = { trendingProducts: [createMockListingProduct()] }
    const wrapper = mountSlideIn()
    const firstOpen = wrapper.get('[data-testid="recommendations"]').element

    useAddToBasketSlideIn().close()
    await nextTick()

    expect(wrapper.get('[data-testid="recommendations"]').element).toBe(
      firstOpen,
    )

    useAddToBasketSlideIn().open(addedItem)
    await nextTick()

    expect(wrapper.get('[data-testid="recommendations"]').element).not.toBe(
      firstOpen,
    )
  })

  it('renders no recommendations on a page that sends none', () => {
    expect(
      mountSlideIn().find('[data-testid="recommendations"]').exists(),
    ).toBe(false)
  })

  it('renders no recommendations when the page sends an empty set', () => {
    mocks.pageProps = { trendingProducts: [] }

    expect(
      mountSlideIn().find('[data-testid="recommendations"]').exists(),
    ).toBe(false)
  })

  it('labels the dialog by its own heading and offers a close control', () => {
    const wrapper = mountSlideIn()

    const headingId = wrapper
      .get('[role="dialog"]')
      .attributes('aria-labelledby')
    expect(wrapper.get(`[id="${headingId}"]`).text()).toBe(
      'add_to_basket_slide_in.title',
    )
    expect(
      wrapper
        .get('[data-testid="add-to-basket-slide-in-close"]')
        .attributes('aria-label'),
    ).toBe('global.close')
  })
})

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BasketItem } from '@scayle/storefront/types'
import { createMockBasketItem } from '@test/mock-data/basket'
import { createMockCampaign } from '@test/mock-data/promotions'
import { nextTick } from 'vue'
import { createOverlayTestPlugin } from '@test/utils/overlay'
import Layout from './Layout.vue'

// Mutable so individual tests can render the layout for a different page.
let mockComponent = 'Home'
// Mutable so a test can add the deferred props a suggestion depends on.
let mockSharedProps: Record<string, unknown> = {}

vi.mock('@inertiajs/vue3', () => ({
  Head: {
    name: 'Head',
    template: '<div data-testid="inertia-head"><slot /></div>',
  },
  usePage: () => ({
    get component() {
      return mockComponent
    },
    get props() {
      return {
        storefront: {
          config: { tenantSpace: 'test-space' },
          country: { publicFields: {} },
        },
        ...mockSharedProps,
      }
    },
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const { addedItem } = await vi.hoisted(async () => {
  const { shallowRef } = await import('vue')
  return { addedItem: shallowRef<BasketItem | null>(null) }
})

vi.mock('@client/composables/useAddToBasketSlideIn', () => ({
  useAddToBasketSlideIn: () => ({ addedItem }),
}))

vi.mock('@client/components/basket/SFAddToBasketSlideIn.vue', () => ({
  // Lets `defineAsyncComponent` unwrap `default` from the mocked module.
  __esModule: true,
  default: { template: '<div data-testid="add-to-basket-slide-in" />' },
}))

describe('Layout', () => {
  beforeEach(() => {
    addedItem.value = null
  })

  const defaultProps = {
    navigation: [],
    footer: { footer: [], bottomFooter: [] },
    promotions: [],
    campaign: null,
  }

  const stubs = {
    SFAnalyticsHead: { template: '<div />' },
    SFDealRibbon: { template: '<div />' },
    SFHeaderTopBar: { template: '<div />' },
    SFHeader: { template: '<div />' },
    SFFooter: { template: '<div />' },
    SFToastContainer: { template: '<div />' },
  }

  // `Layout.vue` calls `useOverlay()`, so every mount needs an overlay plugin.
  const mountLayout = ({
    props = {},
    stubs: stubOverrides = {},
    overlays = createOverlayTestPlugin(),
  }: {
    props?: Record<string, unknown>
    stubs?: Record<string, unknown>
    overlays?: ReturnType<typeof createOverlayTestPlugin>
  } = {}) =>
    mount(Layout, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: { ...stubs, ...stubOverrides },
        mocks: { $t: (key: string) => key },
        plugins: [overlays.plugin],
      },
    })

  // Takes the page component so no test depends on assigning `mockComponent`
  // before calling this.
  const findPreconnectLinks = (component = 'Home') => {
    mockComponent = component

    return mountLayout()
      .findAll('[data-testid="inertia-head"]')
      .flatMap((head) => head.findAll('link'))
  }

  const headerPromotionCount = (props: Record<string, unknown>) => {
    mockComponent = 'Home'
    return mountLayout({
      props,
      stubs: {
        SFHeader: {
          props: ['promotionCount'],
          template:
            '<header data-testid="header" :data-promotion-count="promotionCount" />',
        },
      },
    })
      .find('[data-testid="header"]')
      .attributes('data-promotion-count')
  }

  const ribbonDealId = (component: string, props: Record<string, unknown>) => {
    mockComponent = component
    const ribbon = mountLayout({
      props,
      stubs: {
        SFDealRibbon: {
          props: ['deal'],
          template: '<div data-testid="ribbon" :data-deal-id="deal.id" />',
        },
      },
    }).find('[data-testid="ribbon"]')

    return ribbon.exists() ? ribbon.attributes('data-deal-id') : undefined
  }

  const SAPI_ORIGIN = 'https://test-space.cdn.scayle.cloud'
  const CHECKOUT_ORIGIN = 'https://test-space.checkout.api.scayle.cloud'

  it('renders the SAPI preconnect with the configured tenantSpace', () => {
    const sapi = findPreconnectLinks().find(
      (link) => link.attributes('href') === SAPI_ORIGIN,
    )

    expect(sapi?.attributes()).toMatchObject({
      rel: 'preconnect',
      crossorigin: 'anonymous',
    })
  })

  // Every page on this layout that loads the checkout web component script.
  it.each(['Basket', 'ProductDetail', 'SignIn'])(
    'renders the checkout web component preconnect on %s',
    (component) => {
      const checkout = findPreconnectLinks(component).find(
        (link) => link.attributes('href') === CHECKOUT_ORIGIN,
      )

      expect(checkout).toBeDefined()
      expect(checkout!.attributes('rel')).toBe('preconnect')
      expect(checkout!.attributes('crossorigin')).toBe('anonymous')
    },
  )

  // `Checkout` does load the script, but renders through `SimpleLayout`, which
  // carries its own hint — this layout must not emit a second one.
  it.each(['Home', 'Wishlist', 'Checkout'])(
    'renders only the SAPI preconnect on %s',
    (component) => {
      const hrefs = findPreconnectLinks(component).map((link) =>
        link.attributes('href'),
      )

      // Asserted as equality, not `not.toContain`: a bare negative assertion
      // would also pass if the head stopped rendering links altogether.
      expect(hrefs).toEqual([SAPI_ORIGIN])
    },
  )

  // The anchor wraps the ribbon and the header, so toasts sit below both and
  // move up when the ribbon closes.
  it('anchors toasts to the area holding the ribbon and the header', async () => {
    mockComponent = 'Home'
    const wrapper = mountLayout({
      props: { campaign: createMockCampaign() },
      stubs: {
        SFDealRibbon: { template: '<div data-testid="ribbon" />' },
        SFHeader: { template: '<header data-testid="header" />' },
        SFToastContainer: {
          name: 'SFToastContainer',
          props: ['anchor'],
          template: '<div />',
        },
      },
    })
    await nextTick()

    const anchor: HTMLElement = wrapper
      .findComponent({ name: 'SFToastContainer' })
      .props('anchor')
    const holds = (testId: string) =>
      anchor.contains(wrapper.find(`[data-testid="${testId}"]`).element)

    expect(holds('ribbon')).toBe(true)
    expect(holds('header')).toBe(true)
    expect(holds('main-content')).toBe(false)
  })

  it.for([
    { name: 'offers', component: 'Home', expected: true },
    { name: 'leaves out', component: 'Basket', expected: false },
  ])(
    '$name the skip to basket link on the $component page',
    ({ component, expected }) => {
      mockComponent = component
      const wrapper = mountLayout()

      expect(
        wrapper.find('[data-testid="button-skip-to-basket"]').exists(),
      ).toBe(expected)
    },
  )

  it('mounts the add-to-basket slide-in once an item was added', async () => {
    mockComponent = 'Home'
    const wrapper = mountLayout()
    const slideIn = () => wrapper.find('[data-testid="add-to-basket-slide-in"]')
    await flushPromises()
    expect(slideIn().exists()).toBe(false)

    addedItem.value = createMockBasketItem()
    await flushPromises()

    expect(slideIn().exists()).toBe(true)
  })

  // `[]` is a loaded list, not a pending one: a failed promotions fetch
  // settles as `[]`, and a campaign-only shop still needs its badge.
  it.for([
    {
      state: 'deferred promotions are undefined',
      promotions: undefined,
      campaign: { id: 'campaign-1' },
      expected: '0',
    },
    {
      state: 'promotions loaded empty with a campaign',
      promotions: [],
      campaign: { id: 'campaign-1' },
      expected: '1',
    },
    {
      state: 'promotions and a campaign are loaded',
      promotions: [{ id: 'p-1' }, { id: 'p-2' }],
      campaign: { id: 'campaign-1' },
      expected: '3',
    },
    {
      state: 'promotions are loaded without a campaign',
      promotions: [{ id: 'p-1' }, { id: 'p-2' }],
      campaign: null,
      expected: '2',
    },
  ])(
    'passes a promotion count of $expected when $state',
    ({ promotions, campaign, expected }) => {
      expect(headerPromotionCount({ promotions, campaign })).toBe(expected)
    },
  )

  it.for([
    {
      state: 'a campaign and promotions are present',
      promotions: [{ id: 'p-1' }],
      campaign: { id: 'campaign-1' },
      page: 'Home',
      expected: 'campaign-1',
    },
    {
      state: 'only promotions are present',
      promotions: [{ id: 'p-1' }, { id: 'p-2' }],
      campaign: null,
      page: 'Home',
      expected: 'p-1',
    },
    {
      state: 'only a campaign is present and promotions are still deferred',
      promotions: undefined,
      campaign: { id: 'campaign-1' },
      page: 'Home',
      expected: 'campaign-1',
    },
    {
      state: 'there is neither a campaign nor a promotion',
      promotions: [],
      campaign: null,
      page: 'Home',
      expected: undefined,
    },
    {
      state: 'the page is the basket',
      promotions: [{ id: 'p-1' }],
      campaign: { id: 'campaign-1' },
      page: 'Basket',
      expected: undefined,
    },
  ])(
    'shows the deal $expected in the ribbon when $state',
    ({ promotions, campaign, page, expected }) => {
      expect(ribbonDealId(page, { promotions, campaign })).toBe(expected)
    },
  )

  it('opens the country detection modal when a shop suggestion applies', () => {
    mockComponent = 'Home'
    mockSharedProps = {
      customer: null,
      shopSuggestion: { region: 'AT', languages: [{ locale: 'de-AT' }] },
    }
    const overlays = createOverlayTestPlugin()

    mountLayout({ overlays })
    mockSharedProps = {}

    expect(overlays.entries().some((entry) => entry.isOpen)).toBe(true)
  })

  it('keeps the country detection modal closed without a shop suggestion', () => {
    mockComponent = 'Home'
    mockSharedProps = { customer: null, shopSuggestion: null }
    const overlays = createOverlayTestPlugin()

    mountLayout({ overlays })
    mockSharedProps = {}

    expect(overlays.entries().some((entry) => entry.isOpen)).toBe(false)
  })
})

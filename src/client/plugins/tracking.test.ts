import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, watch } from 'vue'
import { whenever } from '@vueuse/core'
import type { EffectScope } from 'vue'
import { IMAGE_VIEW_QUERY_KEY } from '@shared/constants/imageView'
import { createTrackingPlugin } from './tracking'

const STOREFRONT = {
  config: { shopKey: 'de', version: '1.2.3' },
  country: {
    isDefault: true,
    shopCountryId: 1,
    countryCode: 'DE',
    locale: 'de-DE',
    currency: { currencyCode: 'EUR' },
  },
}

const CREDENTIALS = /secret|XYZ/

const SESSION = {
  id: 'session-1',
  lastEventAt: 0,
  start: {
    landing_page_path: '/de',
    utm_source: 'summer_ad',
    utm_campaign: 'sale',
    referrer: 'https://www.google.com/',
  },
}

const mocks = vi.hoisted(() => ({
  provide: vi.fn(),
  runWithContext: vi.fn((callback: () => unknown) => callback()),
  trackPageView: vi.fn(),
  page: {
    url: undefined as string | undefined,
    props: {
      customer: null as Record<string, unknown> | null | undefined,
      storefront: undefined as Record<string, unknown> | undefined,
      product: undefined as Record<string, unknown> | undefined,
      slug: undefined as string | undefined,
      category: undefined as { id: number } | undefined,
      term: undefined as string | undefined,
      order: undefined as { id: number } | undefined,
    },
    component: 'CmsPage',
  },
  session: undefined as Record<string, unknown> | undefined,
  path: '/home',
  query: new URLSearchParams(),
  currentTitle: 'Homepage',
  consentId: undefined as string | undefined,
  consentManagementRequired: true,
  dataLayer: [] as Record<string, unknown>[],
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => mocks.page,
}))

// The real `whenever` runs against the reactive page; the spy is there for
// the server test that asserts the registration itself.
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return { whenever: vi.fn(actual.whenever) }
})

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({
    path: {
      get value() {
        return mocks.path
      },
    },
    query: {
      get value() {
        return mocks.query
      },
    },
  }),
}))

vi.mock('@client/composables/usePageMeta', () => ({
  usePageMeta: () => ({
    currentTitle: {
      get value() {
        return mocks.currentTitle
      },
    },
  }),
}))

vi.mock('@client/composables/tracking/useGlobalEvents', () => ({
  useGlobalEvents: () => ({
    trackPageView: mocks.trackPageView,
  }),
}))

vi.mock('@client/plugins/consentManager', () => ({
  getConsentManagerInstance: () => ({
    get consentId() {
      return { value: mocks.consentId }
    },
    get consentManagementRequired() {
      return mocks.consentManagementRequired
    },
  }),
}))

vi.mock('@client/plugins/analyticsSession', () => ({
  readAnalyticsSession: () => mocks.session,
}))

describe('createTrackingPlugin', () => {
  // The plugin's page URL watch lives outside any component, so each test
  // installs inside its own scope and stops it afterwards.
  let scope: EffectScope

  beforeEach(() => {
    scope = effectScope()
    mocks.trackPageView.mockReset()
    // A reactive page, so the real `watch` in the plugin follows `page.url`.
    // `customer` resolved and signed out, so a pushed event reaches the
    // dataLayer at once.
    mocks.page = reactive({
      url: undefined,
      props: {
        customer: null,
        storefront: STOREFRONT,
        product: undefined,
        slug: undefined,
        category: undefined,
        term: undefined,
        order: undefined,
      },
      component: 'CmsPage',
    })
    mocks.session = undefined
    mocks.path = '/home'
    mocks.query = new URLSearchParams()
    mocks.currentTitle = 'Homepage'
    mocks.consentId = undefined
    mocks.consentManagementRequired = true
    mocks.dataLayer = []
    vi.stubGlobal('window', {
      dataLayer: mocks.dataLayer,
      location: {
        href: 'https://shop.example.com/home',
        origin: 'https://shop.example.com',
      },
    })
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    })
  })

  afterEach(() => {
    scope.stop()
  })

  const install = () => {
    const plugin = createTrackingPlugin()
    scope.run(() =>
      plugin.install({
        provide: mocks.provide,
        runWithContext: mocks.runWithContext,
      } as never),
    )
  }

  const getPush = () => {
    expect(mocks.provide).toHaveBeenCalledTimes(1)
    return mocks.provide.mock.calls[0]?.[1] as {
      push: (event: Record<string, unknown>) => void
      context: { value: Record<string, unknown> | undefined }
    }
  }

  // Inertia assigns the page, then the scheduler flushes the URL watch.
  const visit = async (url: string, component: string) => {
    const { pathname, searchParams } = new URL(url, 'https://shop.example.com')
    mocks.path = pathname
    mocks.query = searchParams
    mocks.page.component = component
    mocks.page.url = url
    await nextTick()
  }
  const pageAssigned = () => visit('/home', 'CmsPage')

  const contextOf = (index: number) =>
    (mocks.dataLayer[index] as { context: Record<string, unknown> }).context

  it('provides the push API on install without resolving the page view composable', () => {
    install()

    expect(mocks.provide).toHaveBeenCalledTimes(1)
    // `useGlobalEvents()` injects the tracking `push` API through
    // `useTracking()`, which needs the app context, so it is resolved per
    // page view instead of at install.
    expect(mocks.runWithContext).not.toHaveBeenCalled()
  })

  it('resolves the page view composable inside the app context per page view', async () => {
    install()

    await pageAssigned()

    expect(mocks.runWithContext).toHaveBeenCalledTimes(1)
    expect(mocks.trackPageView).toHaveBeenCalledTimes(1)

    const { push } = getPush()
    push({ event: 'page_view' })

    // The first page view has no navigation before it.
    expect(contextOf(0).previous_page_path).toBeUndefined()
    expect(contextOf(0).previous_page_type).toBeUndefined()
  })

  it('watches for the page and the customer without reading an unassigned page', async () => {
    // Every plugin installs before Inertia assigns the initial page: `props`
    // and `component` are `undefined` until then.
    ;(mocks.page as { props: unknown }).props = undefined
    ;(mocks.page as { component: unknown }).component = undefined
    install()
    await nextTick()

    expect(mocks.trackPageView).not.toHaveBeenCalled()

    // The customer watch must not read the unassigned page either; resolving
    // the prop drains the (empty) queue without touching the data layer.
    ;(mocks.page as { props: unknown }).props = {
      customer: null,
      storefront: STOREFRONT,
      product: undefined,
      slug: undefined,
    }
    await nextTick()

    expect(mocks.dataLayer).toHaveLength(0)
  })

  it('reads the page_title the new page has set', async () => {
    install()
    const { push } = getPush()
    mocks.trackPageView.mockImplementation(() => push({ event: 'page_view' }))
    // Stands in for the render: `PageMetaHead` sets `currentTitle` during the
    // flush that follows a page assignment, before post-flush watchers run.
    scope.run(() =>
      watch(
        () => mocks.page.url,
        (url) => {
          mocks.currentTitle = url === '/home' ? 'Homepage' : 'Shoes'
        },
      ),
    )
    await pageAssigned()
    mocks.dataLayer.length = 0

    await visit('/category/shoes', 'ProductListing')

    expect(mocks.dataLayer).toEqual([
      expect.objectContaining({ event: 'page_view', page_title: 'Shoes' }),
    ])
  })

  it('drains once the deferred customer prop resolves, signed out too', async () => {
    mocks.page.props.customer = undefined
    install()
    const { push } = getPush()

    push({ event: 'page_view' })
    expect(mocks.dataLayer).toHaveLength(0)

    // Signed out, so the drain must not wait for a signed-in customer.
    mocks.page.props.customer = null
    await nextTick()

    expect(contextOf(0)).toMatchObject({
      user_type: 'guest',
      login_state: 'logged_out',
    })
  })

  it('provides no context until the deferred customer prop resolves', () => {
    mocks.page.props.customer = undefined
    install()
    expect(getPush().context.value).toBeUndefined()
  })

  it('provides the page fields of the current page in the context', () => {
    install()
    expect(getPush().context.value).toMatchObject({
      page_type: 'cms_page',
      page_path: '/home',
    })
  })

  it('provides no customer data beyond the allowlist in the context', () => {
    mocks.page.props.customer = {
      id: 42,
      idHash: 'h',
      email: 'jane@example.com',
      groups: [],
    }
    install()
    expect(JSON.stringify(getPush().context.value)).not.toContain(
      'jane@example.com',
    )
  })

  it('holds events until the deferred customer prop resolves, then pushes them with the page they were captured on', async () => {
    mocks.page.props.customer = undefined
    install()
    const { push } = getPush()

    push({ event: 'page_view' })
    mocks.path = '/p/sneaker-1'
    mocks.page.component = 'ProductDetail'
    mocks.page.props.product = { id: 42 }
    push({ event: 'add_to_cart', ecommerce: { items: [{ item_id: '1' }] } })

    expect(mocks.dataLayer).toHaveLength(0)

    // Signed in, so customer fields stamped at capture, from the unresolved
    // prop, would read as a guest.
    mocks.page.props.customer = { id: 42, idHash: 'h', groups: [] }
    await nextTick()

    expect(mocks.dataLayer).toHaveLength(3)
    expect(mocks.dataLayer[0]).toMatchObject({ event: 'page_view' })
    expect(contextOf(0)).toMatchObject({
      page_type: 'cms_page',
      page_path: '/home',
      user_id: 'h',
      login_state: 'logged_in',
    })
    expect(mocks.dataLayer[1]).toEqual({ ecommerce: null })
    expect(mocks.dataLayer[2]).toMatchObject({
      event: 'add_to_cart',
      ecommerce: { items: [{ item_id: '1' }] },
    })
    expect(contextOf(2)).toMatchObject({
      page_type: 'product_detail',
      page_path: '/p/sneaker-1',
      user_id: 'h',
      login_state: 'logged_in',
    })
    expect(contextOf(2)).not.toHaveProperty('page_type_id')
  })

  it.for([
    {
      label:
        'stamps the customer fields of a signed-in customer in the new group',
      customer: { id: 42, idHash: 'customer-id-hash', groups: ['new', 'vip'] },
      expected: {
        user_id: 'customer-id-hash',
        user_type: 'new',
        login_state: 'logged_in',
        customer_segment_new: true,
        customer_segment_vip: true,
      },
    },
    {
      label:
        'classifies a signed-in customer outside the new group as returning',
      customer: { id: 42, idHash: 'h', groups: ['vip'] },
      expected: {
        user_id: 'h',
        user_type: 'returning',
        login_state: 'logged_in',
        customer_segment_new: undefined,
        customer_segment_vip: true,
      },
    },
    {
      label: 'stamps the guest fields once signed out',
      customer: null,
      expected: {
        user_id: undefined,
        user_type: 'guest',
        login_state: 'logged_out',
        customer_segment_new: undefined,
        customer_segment_vip: undefined,
      },
    },
  ])('$label', ({ customer, expected }) => {
    mocks.page.props.customer = customer
    install()
    const { push } = getPush()

    push({ event: 'page_view' })

    const context = contextOf(0)
    expect({
      user_id: context.user_id,
      user_type: context.user_type,
      login_state: context.login_state,
      customer_segment_new: context.customer_segment_new,
      customer_segment_vip: context.customer_segment_vip,
    }).toEqual(expected)
  })

  it('reports a guest checkout customer as logged in without a user id', () => {
    mocks.page.props.customer = {
      id: 42,
      idHash: 'h',
      isGuest: true,
      groups: [],
    }
    install()
    const { push } = getPush()

    push({ event: 'page_view' })

    expect(contextOf(0)).toMatchObject({ login_state: 'logged_in' })
    expect(contextOf(0).user_id).toBeUndefined()
  })

  it('reads the session id and the landing attribution from the SCAYLE Analytics session', () => {
    mocks.session = SESSION
    install()
    const { push } = getPush()

    push({ event: 'page_view' })

    expect(contextOf(0)).toMatchObject({
      session_id: 'session-1',
      landing_page_path: '/de',
      utm_source: 'summer_ad',
      utm_campaign: 'sale',
      referrer: 'https://www.google.com/',
    })
  })

  it('omits the session fields while no SCAYLE Analytics session exists', () => {
    install()
    const { push } = getPush()

    push({ event: 'page_view' })

    const context = contextOf(0)
    expect(context.session_id).toBeUndefined()
    expect(context.landing_page_path).toBeUndefined()
    expect(context.utm_source).toBeUndefined()
    expect(context.referrer).toBeUndefined()
  })

  it('reads the shop fields from the storefront prop and the device type from the user agent', () => {
    install()
    const { push } = getPush()

    push({ event: 'page_view' })

    expect(contextOf(0)).toMatchObject({
      shop_country_id: 1,
      shop_key: 'de',
      country_code: 'DE',
      locale: 'de-DE',
      shop_currency: 'EUR',
      shop_version: '1.2.3',
      device_type: 'ios',
    })
  })

  it('merges the consent id from the consent manager when available', () => {
    install()
    const { push } = getPush()

    push({ event: 'page_view' })
    mocks.consentId = 'consent-123'
    push({ event: 'page_view' })

    expect(contextOf(0).consent_id).toBe('')
    expect(contextOf(1).consent_id).toBe('consent-123')
  })

  it('leaves the consent id out where the country requires no consent management', () => {
    mocks.consentManagementRequired = false
    install()
    const { push } = getPush()

    push({ event: 'page_view' })

    expect(contextOf(0).consent_id).toBeUndefined()
  })

  it('reports the start page as homepage', async () => {
    install()
    const { push } = getPush()

    await visit('/', 'CmsPage')
    push({ event: 'page_view' })

    expect(contextOf(0).page_type).toBe('homepage')
  })

  it('tracks page_view on a visit to a new path', async () => {
    install()
    await pageAssigned()
    mocks.trackPageView.mockClear()

    await visit('/category/shoes', 'ProductListing')

    expect(mocks.trackPageView).toHaveBeenCalledTimes(1)
  })

  it('sets previous_page_path and previous_page_type from the prior navigation', async () => {
    install()
    const { push } = getPush()
    await pageAssigned()

    await visit('/category/shoes', 'ProductListing')
    await visit('/p/sneaker-1', 'ProductDetail')

    push({ event: 'page_view' })

    expect(contextOf(0)).toMatchObject({
      previous_page_path: '/category/shoes',
      previous_page_type: 'product_listing',
    })
  })

  it('reports the allowlisted query keys in page_path and previous_page_path', async () => {
    install()
    const { push } = getPush()
    await pageAssigned()

    await visit('/category/shoes?page=2&hash=secret', 'ProductListing')
    await visit('/p/sneaker-1?variantId=7&cbd=token', 'ProductDetail')

    push({ event: 'page_view' })

    expect(contextOf(0)).toMatchObject({
      page_path: '/p/sneaker-1?variantId=7',
      previous_page_path: '/category/shoes?page=2',
    })
  })

  it('tracks page_view for query-only navigation', async () => {
    install()
    await pageAssigned()
    mocks.trackPageView.mockClear()

    // Pagination, filters and sorting move the query string only.
    await visit('/home?page=2', 'CmsPage')

    expect(mocks.trackPageView).toHaveBeenCalledTimes(1)
  })

  it('does not track page_view for an image view switch', async () => {
    install()
    await visit('/category/shoes?page=2', 'ProductListing')
    mocks.trackPageView.mockClear()

    await visit(
      `/category/shoes?page=2&${IMAGE_VIEW_QUERY_KEY}=model`,
      'ProductListing',
    )

    expect(mocks.trackPageView).not.toHaveBeenCalled()
  })

  it('does not track page_view when the page is reassigned with the same URL', async () => {
    install()
    await pageAssigned()
    mocks.trackPageView.mockClear()

    // A press on a `prefetch-on-press` link and a deferred-prop reload both
    // leave `page.url` as it is, even when the page object is replaced.
    mocks.page.props = { ...mocks.page.props }
    mocks.page.url = '/home'
    await nextTick()

    expect(mocks.trackPageView).not.toHaveBeenCalled()
  })

  it('tracks a back navigation, with the page it left as the previous page', async () => {
    install()
    const { push } = getPush()
    await pageAssigned()
    await visit('/category/shoes', 'ProductListing')
    mocks.trackPageView.mockClear()

    await visit('/home', 'CmsPage')

    expect(mocks.trackPageView).toHaveBeenCalledTimes(1)
    push({ event: 'page_view' })
    expect(contextOf(0)).toMatchObject({
      previous_page_path: '/category/shoes',
      previous_page_type: 'product_listing',
    })
  })

  it('pushes page_view with top-level page fields', () => {
    install()
    const { push } = getPush()

    mocks.page.component = 'ProductDetail'
    mocks.page.props.product = { id: 42 }

    push({ event: 'page_view' })

    const event = mocks.dataLayer[0]
    expect(event).toMatchObject({
      event: 'page_view',
      page_type: 'product_detail',
      page_type_id: '42',
      page_location: 'https://shop.example.com/home',
      page_title: 'Homepage',
    })
  })

  // The stripping itself is `toAttributionUrl`'s, tested in
  // `src/shared/utils/tracking.test.ts`; this only proves `page_location`
  // goes through it, so keep one credential-bearing URL.
  it('reports page_location without credentials', () => {
    window.location.href =
      'https://shop.example.com/signin?hash=secret&utm_source=newsletter&gclid=abc#access_token=XYZ'
    install()
    const { push } = getPush()

    push({ event: 'page_view' })

    expect(mocks.dataLayer[0]!.page_location).toBe(
      'https://shop.example.com/signin?utm_source=newsletter&gclid=abc',
    )
    expect(JSON.stringify(mocks.dataLayer)).not.toMatch(CREDENTIALS)
  })

  it('uses the CMS slug as the page_type_id on a CMS page', () => {
    install()
    const { push } = getPush()

    mocks.page.component = 'CmsPage'
    mocks.page.props.slug = 'content/about-us'

    push({ event: 'page_view' })

    expect(mocks.dataLayer[0]).toMatchObject({
      event: 'page_view',
      page_type: 'cms_page',
      page_type_id: 'content/about-us',
    })
  })

  // The remaining branches of `resolvePageTypeId`, next to the ProductDetail
  // and CmsPage cases above.
  it.for([
    {
      label: 'ProductListing',
      component: 'ProductListing',
      props: { category: { id: 7 } },
      pageTypeId: '7',
    },
    {
      label: 'Search',
      component: 'Search',
      props: { term: 'sneaker' },
      pageTypeId: 'sneaker',
    },
    {
      label: 'OrderSuccess',
      component: 'OrderSuccess',
      props: { order: { id: 9001 } },
      pageTypeId: '9001',
    },
    {
      label: 'AccountOrderDetail',
      component: 'AccountOrderDetail',
      props: { order: { id: 9002 } },
      pageTypeId: '9002',
    },
  ])(
    'resolves the page_type_id on $label from the page props',
    ({ component, props, pageTypeId }) => {
      install()
      const { push } = getPush()

      mocks.page.component = component
      mocks.page.props = { ...mocks.page.props, ...props }
      push({ event: 'page_view' })

      expect(mocks.dataLayer[0]).toMatchObject({
        event: 'page_view',
        page_type_id: pageTypeId,
      })
    },
  )

  describe('on the server', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined)
    })

    it('provides the push API without watching the page', async () => {
      install()
      await pageAssigned()

      // `useTracking()` injects during SSR, so the key must be provided even
      // though nothing on the server can be tracked.
      expect(mocks.provide).toHaveBeenCalledTimes(1)
      expect(vi.mocked(whenever)).not.toHaveBeenCalled()
      expect(mocks.trackPageView).not.toHaveBeenCalled()
    })

    it('drops a pushed event instead of reaching for the data layer', () => {
      install()
      const { push } = getPush()

      expect(() => push({ event: 'page_view' })).not.toThrow()
      expect(mocks.dataLayer).toHaveLength(0)
    })
  })
})

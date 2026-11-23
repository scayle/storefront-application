import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { whenever } from '@vueuse/core'
import type { CentAmount } from '@scayle/storefront-api'
import { ANALYTICS_MAX_EVENT_BODY_BYTES } from '@scayle/storefront/shared'
import { HOUR_MS } from '@client/utils/time'
import { createAnalyticsPlugin, MAX_QUEUED_EVENTS } from './analytics'
import type { AnalyticsPlugin } from './analyticsKey'
import { readAnalyticsSession } from './analyticsSession'

const VENDOR_ID = 'scayle-analytics-vendor'
const PRICE = 8995 as CentAmount
const SESSION_KEY = 'scayle-analytics-session'

/** Minimal `storefront` shared prop for the real `localizeLink` under the `path` selector. */
const storefront = {
  config: { countrySelector: 'path' },
  country: { path: 'de', isDefault: true },
}

const mocks = vi.hoisted(() => ({
  provide: vi.fn(),
  sendBeacon: vi.fn(),
  randomUUID: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  page: {
    props: {
      storefront: undefined as Record<string, unknown> | undefined,
    },
    component: 'ProductDetail',
    url: '/de/p/shoe-1',
  },
  path: '/de/p/shoe-1',
  consentManager: null as {
    state: Record<string, boolean>
    consentId: { value: string | undefined }
    consentManagementRequired: boolean
    cmpPending: { value: boolean }
  } | null,
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => mocks.page,
}))

// The real `whenever` runs against the reactive consent manager; the spy is
// there for the tests that assert the registration itself.
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return { whenever: vi.fn(actual.whenever) }
})

// The query follows the page URL the tests drive; the path is set on its own.
vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({
    path: {
      get value() {
        return mocks.path
      },
    },
    query: {
      get value() {
        return new URLSearchParams(mocks.page.url?.split('?')[1])
      },
    },
  }),
}))

vi.mock('@client/plugins/consentManager', () => ({
  getConsentManagerInstance: () => mocks.consentManager,
}))

vi.mock('@client/consent-vendor.config.json', () => ({
  default: { 'scayle-analytics': 'scayle-analytics-vendor' },
}))

// `localizeLink` stays real so the URL and the homepage detection are derived
// from the storefront prop, not from a stub.
vi.mock('@scayle/storefront/shared', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@scayle/storefront/shared')>()
  return {
    ...actual,
    createLogger: () => ({ debug: mocks.debug, warn: mocks.warn }),
  }
})

// Fresh targets per test, so listeners from one install do not leak into the next.
let documentStub: EventTarget & { referrer: string }
let windowStub: EventTarget & {
  location: { href: string; origin: string }
  localStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}
let storage: Map<string, string>

const ORIGIN = 'https://shop.example'

const storedSession = () => JSON.parse(storage.get(SESSION_KEY) ?? 'null')

function install(): AnalyticsPlugin {
  createAnalyticsPlugin().install({ provide: mocks.provide } as never)
  return mocks.provide.mock.calls[0]?.[1] as AnalyticsPlugin
}

function grantConsent() {
  // Reactive, so the real `whenever` and `watch` the plugin registers follow
  // the mutations a test makes after the install.
  mocks.consentManager = reactive({
    state: { [VENDOR_ID]: true } as Record<string, boolean>,
    consentId: { value: 'consent-1' },
    consentManagementRequired: true,
    cmpPending: { value: false },
  })
}

/**
 * A consent manager whose adapter reports the CMP is still loading. It has to
 * be `reactive`, since the flush is driven by a real `watch` on `cmpPending`
 * rather than by the stubbed `whenever`.
 */
function loadingConsentManager() {
  const consentManager = reactive({
    state: {} as Record<string, boolean>,
    consentId: { value: undefined as string | undefined },
    consentManagementRequired: true,
    cmpPending: { value: true },
  })
  mocks.consentManager = consentManager
  return consentManager
}

/** Reports the CMP decision in one tick, as the Usercentrics adapter does. */
function reportConsent(
  consentManager: ReturnType<typeof loadingConsentManager>,
  given = true,
) {
  consentManager.state[VENDOR_ID] = given
  consentManager.consentId.value = 'consent-1'
  consentManager.cmpPending.value = false
}

const sentBlob = (index: number) =>
  mocks.sendBeacon.mock.calls[index]?.[1] as Blob

const sentBody = async (index = 0) => JSON.parse(await sentBlob(index).text())

const sentBodies = () =>
  Promise.all(mocks.sendBeacon.mock.calls.map((_, index) => sentBody(index)))

/**
 * A `view_basket` payload with `lineCount` lines, each carrying the fields a
 * real basket line does, so the byte budget is spent at a realistic rate.
 */
const basketOf = (lineCount: number) => ({
  total_price: 1234567 as CentAmount,
  total_sale_discount: 0 as CentAmount,
  total_campaign_discount: 0 as CentAmount,
  total_promotions_discount: 0 as CentAmount,
  products: Array.from({ length: lineCount }, (_, index) => ({
    product_id: `${1000000 + index}`,
    brand_id: '1234',
    variant_id: `${12000000 + index}`,
    campaign_id: '31',
    price: PRICE,
    discount: 2000 as CentAmount,
    quantity: 2,
    promotion_ids: ['b6d5fb1b-7c1e-48e1-946b-d8e948983cfb'],
    position: index + 1,
    total: lineCount,
  })),
})

describe('createAnalyticsPlugin', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false)
    documentStub = Object.assign(new EventTarget(), { referrer: '' })
    storage = new Map()
    windowStub = Object.assign(new EventTarget(), {
      location: { href: `${ORIGIN}/de/p/shoe-1`, origin: ORIGIN },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value)
        },
        removeItem: (key: string) => {
          storage.delete(key)
        },
      },
    })
    vi.stubGlobal('window', windowStub)
    vi.stubGlobal('document', documentStub)
    vi.stubGlobal('navigator', {
      sendBeacon: mocks.sendBeacon,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    })
    vi.stubGlobal('crypto', { randomUUID: mocks.randomUUID })
    mocks.sendBeacon.mockReturnValue(true)
    mocks.randomUUID.mockReturnValue('session-1')
    // A fresh plain object per test: the real-watcher cases below swap in a
    // `reactive` page, which must not leak into the tests that follow it.
    mocks.page = {
      props: { storefront },
      component: 'ProductDetail',
      url: '/de/p/shoe-1',
    }
    mocks.path = '/de/p/shoe-1'
    grantConsent()
  })

  afterEach(() => {
    vi.useRealTimers()
    // `resetAllMocks` also drains `mockReturnValueOnce` queues a test left
    // behind, which `clearAllMocks` would carry into the next test.
    vi.resetAllMocks()
  })

  describe('consent gate', () => {
    // `state` and `consentId` start granted from the test setup; each row
    // withholds one piece before the install.
    it.for([
      {
        label: 'the vendor flag is absent',
        withhold: () => {
          mocks.consentManager!.state = {}
        },
      },
      {
        label: 'the vendor consent is withdrawn',
        withhold: () => {
          mocks.consentManager!.state[VENDOR_ID] = false
        },
      },
      {
        label: 'the consent id is missing',
        withhold: () => {
          mocks.consentManager!.consentId.value = undefined
        },
      },
    ])('drops an event when $label', ({ withhold }) => {
      withhold()
      const { track } = install()

      track('view_page')

      expect(mocks.sendBeacon).not.toHaveBeenCalled()
      expect(mocks.debug).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ eventName: 'view_page' }),
      )
    })

    it('does not replay events from before the flag flipped', async () => {
      mocks.consentManager!.state = {}
      const { track } = install()

      track('view_page')
      mocks.consentManager!.state[VENDOR_ID] = true
      track('view_product_detail', { product_id: 'p-1', price: PRICE })

      expect(await sentBodies()).toEqual([
        expect.objectContaining({ event_name: 'view_product_detail' }),
      ])
    })

    it('fires without a consent gate or consent id where consent management is not required', async () => {
      mocks.consentManager = {
        state: {},
        consentId: { value: undefined },
        consentManagementRequired: false,
        cmpPending: { value: false },
      }
      const { track } = install()

      track('view_page')

      expect(await sentBody(0)).toMatchObject({ event_name: 'view_page' })
      expect(await sentBody(0)).not.toHaveProperty('consent_id')
    })

    it('fails closed and warns at install when the consent manager plugin is missing', () => {
      mocks.consentManager = null
      const { track } = install()

      track('view_page')

      expect(mocks.sendBeacon).not.toHaveBeenCalled()
      expect(mocks.warn).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: expect.stringContaining('not installed'),
        }),
      )
    })

    it('warns once per page load when the configured vendor id is unknown to the consent manager', async () => {
      mocks.consentManager!.state = { 'some-other-vendor': true }
      mocks.consentManager!.consentId.value = undefined
      install()

      // The adapter ends the CMP report by setting the consent id; the
      // configured vendor itself was never reported.
      mocks.consentManager!.consentId.value = 'consent-1'
      await nextTick()

      expect(mocks.warn).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: expect.stringContaining('unknown to the consent manager'),
          vendorId: VENDOR_ID,
        }),
      )

      // A CMP that reports again must not warn again: the diagnosis runs once.
      mocks.consentManager!.consentId.value = undefined
      await nextTick()
      mocks.consentManager!.consentId.value = 'consent-2'
      await nextTick()

      expect(mocks.warn).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: expect.stringContaining('unknown to the consent manager'),
          vendorId: VENDOR_ID,
        }),
      )
    })

    it('warns when the consent manager grants the vendor without a consent id', async () => {
      mocks.consentManager!.state = {}
      mocks.consentManager!.consentId.value = undefined
      install()

      // The adapter granted the vendor but never delivered a consent id.
      mocks.consentManager!.state[VENDOR_ID] = true
      await nextTick()

      expect(mocks.warn).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: expect.stringContaining('without a consent id'),
          vendorId: VENDOR_ID,
        }),
      )
    })

    it('does not warn when the consent manager reports its vendors across two ticks', async () => {
      const consentManager = reactive({
        state: {} as Record<string, boolean>,
        consentId: { value: undefined as string | undefined },
        consentManagementRequired: true,
        cmpPending: { value: false },
      })
      mocks.consentManager = consentManager
      install()

      // An essential-only report first, the real consent event a tick later.
      consentManager.state['some-other-vendor'] = true
      await nextTick()
      consentManager.state[VENDOR_ID] = true
      consentManager.consentId.value = 'consent-1'
      await nextTick()

      expect(mocks.warn).not.toHaveBeenCalled()
    })

    it('warns when the consent manager grants the vendor a tick before the consent id', async () => {
      const consentManager = reactive({
        state: {} as Record<string, boolean>,
        consentId: { value: undefined as string | undefined },
        consentManagementRequired: true,
        cmpPending: { value: false },
      })
      mocks.consentManager = consentManager
      install()

      // Splitting the two writes breaks the adapter contract documented on
      // `ConsentManagerPlugin.consentId`. A grant with no consent id cannot be
      // told apart from one whose id is still coming, so it warns.
      consentManager.state[VENDOR_ID] = true
      await nextTick()
      consentManager.consentId.value = 'consent-1'
      await nextTick()

      expect(mocks.warn).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: expect.stringContaining('without a consent id'),
          vendorId: VENDOR_ID,
        }),
      )
    })

    it('registers no consent diagnosis where consent management is not required', () => {
      mocks.consentManager = {
        state: { 'some-other-vendor': true },
        consentId: { value: undefined },
        consentManagementRequired: false,
        cmpPending: { value: false },
      }
      install()

      expect(vi.mocked(whenever)).not.toHaveBeenCalled()
      expect(mocks.warn).not.toHaveBeenCalled()
    })

    it('does not warn about the vendor id when the user declined it', async () => {
      mocks.consentManager!.state = { [VENDOR_ID]: false }
      mocks.consentManager!.consentId.value = undefined
      const { track } = install()

      // The report ends with the consent id; the declined vendor must not
      // read as unknown.
      mocks.consentManager!.consentId.value = 'consent-1'
      await nextTick()
      track('view_page')

      expect(mocks.warn).not.toHaveBeenCalled()
      expect(mocks.debug).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ eventName: 'view_page' }),
      )
    })

    it('drops held events when consent is withdrawn before they are sent', () => {
      mocks.sendBeacon.mockReturnValueOnce(false).mockReturnValue(true)
      const { track } = install()

      track('view_page')
      mocks.consentManager!.state[VENDOR_ID] = false
      documentStub.dispatchEvent(new Event('visibilitychange'))
      mocks.consentManager!.state[VENDOR_ID] = true
      documentStub.dispatchEvent(new Event('visibilitychange'))

      expect(mocks.sendBeacon).toHaveBeenCalledTimes(1)
      expect(mocks.debug).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ droppedEvents: 1 }),
      )
    })

    it('stamps the consent id the consent manager holds at hand-off', async () => {
      mocks.sendBeacon.mockReturnValueOnce(false).mockReturnValue(true)
      const { track } = install()

      track('view_page')
      // A CMP preference update re-issues the controller id while the vendor
      // stays granted; the held event must carry the id valid when it ships.
      mocks.consentManager!.consentId.value = 'consent-2'
      documentStub.dispatchEvent(new Event('visibilitychange'))

      expect(await sentBody(1)).toMatchObject({ consent_id: 'consent-2' })
    })
  })

  describe('CMP loading', () => {
    it('holds an event captured before the CMP reports and sends it once consent arrives', async () => {
      const consentManager = loadingConsentManager()
      const { track } = install()

      track('view_page')

      expect(mocks.sendBeacon).not.toHaveBeenCalled()

      consentManager.state[VENDOR_ID] = true
      consentManager.consentId.value = 'consent-1'
      consentManager.cmpPending.value = false
      await nextTick()

      expect(await sentBodies()).toEqual([
        expect.objectContaining({
          event_name: 'view_page',
          consent_id: 'consent-1',
        }),
      ])
    })

    it('discards an event held for the CMP when the report denies the vendor', async () => {
      const consentManager = loadingConsentManager()
      const { track } = install()

      track('view_page')
      consentManager.state[VENDOR_ID] = false
      consentManager.cmpPending.value = false
      await nextTick()

      expect(mocks.sendBeacon).not.toHaveBeenCalled()
      expect(mocks.debug).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ droppedEvents: 1 }),
      )
    })

    it('drops rather than holds when no adapter reports the CMP is loading', () => {
      mocks.consentManager!.state = {}
      const { track } = install()

      track('view_page')

      expect(mocks.sendBeacon).not.toHaveBeenCalled()
      expect(mocks.debug).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ eventName: 'view_page' }),
      )
    })

    it('drops the oldest held event beyond the queue cap', async () => {
      const consentManager = loadingConsentManager()
      const { track } = install()

      for (let index = 0; index <= MAX_QUEUED_EVENTS; index++) {
        track('select_product', {
          product_id: `p-${index}`,
          price: PRICE,
          product_list_type: 'category',
          position: index,
        })
      }
      reportConsent(consentManager)
      await nextTick()

      expect(mocks.sendBeacon).toHaveBeenCalledTimes(MAX_QUEUED_EVENTS)
      expect(await sentBody(0)).toMatchObject({ product_id: 'p-1' })
      expect(mocks.warn).toHaveBeenCalledExactlyOnceWith({
        message: 'SCAYLE Analytics queue full, oldest event dropped',
      })
    })

    it('holds a page-load burst until the CMP reports', async () => {
      const consentManager = loadingConsentManager()
      const { track } = install()

      track('view_page')
      // A listing page queues a tile event per product of the first rows.
      for (let index = 0; index < 60; index += 1) {
        track('view_product_tile', {
          product_id: `p-${index}`,
          price: PRICE,
          product_list_type: 'category',
          position: index,
        })
      }
      reportConsent(consentManager)
      await nextTick()

      expect(mocks.sendBeacon).toHaveBeenCalledTimes(61)
      expect(mocks.warn).not.toHaveBeenCalled()
    })
  })

  describe('payload', () => {
    it('merges the event properties with the client context', async () => {
      const { track } = install()

      track('add_to_basket', {
        product_id: 'p-1',
        variant_id: 'v-1',
        price: PRICE,
        quantity: 1,
      })

      expect(mocks.sendBeacon).toHaveBeenCalledExactlyOnceWith(
        '/de/api/analytics/events',
        expect.any(Blob),
      )
      expect(sentBlob(0).type).toBe('application/json')
      expect(await sentBody(0)).toEqual({
        event_name: 'add_to_basket',
        product_id: 'p-1',
        variant_id: 'v-1',
        price: 8995,
        quantity: 1,
        consent_id: 'consent-1',
        session_id: 'session-1',
        device_type: 'desktop',
        page_type: 'product_detail',
        page_path: '/de/p/shoe-1',
        landing_page_path: '/de/p/shoe-1',
      })
    })

    it('derives device_type from navigator.userAgent', async () => {
      vi.stubGlobal('navigator', {
        sendBeacon: mocks.sendBeacon,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      })
      const { track } = install()

      track('view_page')

      expect(await sentBody(0)).toMatchObject({ device_type: 'ios' })
    })

    // The trim itself is `serializeEvent`'s, tested in
    // `analyticsSerialize.test.ts`; this only proves a normal basket ships
    // whole, not trimmed by the dispatcher on top.
    it('sends a basket under both caps untouched', async () => {
      const basket = basketOf(3)
      const { track } = install()

      track('view_basket', basket)

      expect((await sentBody(0)).products).toEqual(basket.products)
    })

    it('reports the start page as homepage and other CMS pages as cms_page', async () => {
      mocks.page.component = 'CmsPage'
      const { track } = install()

      mocks.path = '/de'
      track('view_page')
      mocks.path = '/de/content/about'
      track('view_page')

      expect((await sentBodies()).map((body) => body.page_type)).toEqual([
        'homepage',
        'cms_page',
      ])
    })

    it('reports the page of the previous view_page as the previous page', async () => {
      mocks.page.component = 'CmsPage'
      mocks.path = '/de'
      const { track } = install()

      track('view_page')
      mocks.page.component = 'ProductDetail'
      mocks.path = '/de/p/shoe-1'
      track('view_page')
      track('add_to_basket', { product_id: 'p-1', price: PRICE })

      const [first, second, third] = await sentBodies()
      expect(first).not.toHaveProperty('previous_page_path')
      expect(first).not.toHaveProperty('previous_page_type')
      expect(second).toMatchObject({
        page_type: 'product_detail',
        previous_page_path: '/de',
        previous_page_type: 'homepage',
      })
      // Events after the navigation report the same previous page.
      expect(third).toMatchObject({
        previous_page_path: '/de',
        previous_page_type: 'homepage',
      })
    })

    it('collapses the account pages into one account page type', async () => {
      mocks.page.component = 'AccountOrders'
      mocks.path = '/de/account/orders'
      const { track } = install()

      track('view_page')

      expect(await sentBody(0)).toMatchObject({ page_type: 'account' })
    })

    it('drops the event on a page without storefront context', () => {
      mocks.page.props.storefront = undefined
      const { track } = install()

      track('view_page')
      documentStub.dispatchEvent(new Event('visibilitychange'))
      windowStub.dispatchEvent(new Event('pagehide'))

      expect(mocks.sendBeacon).not.toHaveBeenCalled()
    })

    it('keeps held events while the storefront context is gone', async () => {
      const consentManager = loadingConsentManager()
      const { track } = install()

      track('view_page')
      // Navigation to the bare-bones Error page while the event is held.
      mocks.page.props.storefront = undefined
      reportConsent(consentManager)
      await nextTick()
      expect(mocks.sendBeacon).not.toHaveBeenCalled()

      mocks.page.props.storefront = storefront
      documentStub.dispatchEvent(new Event('visibilitychange'))

      expect(await sentBodies()).toEqual([
        expect.objectContaining({ event_name: 'view_page' }),
      ])
    })
  })

  describe('view_page trigger', () => {
    /**
     * Installs against a reactive page so the real `watch` runs, and assigns
     * the page afterwards: every plugin installs before the Inertia `App`
     * component assigns the initial page.
     */
    async function installOnPage(url: string, component = 'ProductListing') {
      mocks.path = new URL(url, ORIGIN).pathname
      mocks.page = reactive({
        props: undefined,
        component,
        url: undefined,
      }) as unknown as typeof mocks.page
      install()
      mocks.page.props = { storefront }
      mocks.page.url = url
      await nextTick()
    }

    const pageViews = async () =>
      (await sentBodies()).filter((body) => body.event_name === 'view_page')

    it('fires the first view_page when Inertia assigns the initial page', async () => {
      await installOnPage('/de/p/shoe-1', 'ProductDetail')

      expect(await pageViews()).toEqual([
        expect.objectContaining({
          page_type: 'product_detail',
          page_path: '/de/p/shoe-1',
        }),
      ])
      expect((await pageViews())[0]).not.toHaveProperty('previous_page_path')
    })

    // PLP pagination and filters are partial reloads that move the query
    // string, the registration view is the sign-in page with `?register=true`.
    // Every URL change is a page view, path or query. A deferred-prop reload
    // and the post-login refresh keep the URL; an anchor jump changes only
    // the hash, which Inertia also appends to `page.url` on hydration.
    // Switching the image view on a listing only reorders the tiles the page
    // already shows, so it is not a page view either.
    it.for([
      {
        label: 'fires a view_page on pagination',
        from: '/de/c/shoes-1',
        to: '/de/c/shoes-1?page=2',
        expectedPageViews: 2,
      },
      {
        label: 'fires a view_page on a filter',
        from: '/de/c/shoes-1?page=2',
        to: '/de/c/shoes-1?page=2&color=red',
        expectedPageViews: 2,
      },
      {
        label: 'fires a view_page on the registration view',
        from: '/de/signin',
        to: '/de/signin?register=true',
        expectedPageViews: 2,
      },
      {
        label: 'fires a view_page on a path change',
        from: '/de/c/shoes-1?page=2',
        to: '/de/p/shoe-1',
        expectedPageViews: 2,
      },
      {
        label: 'does not fire a view_page on the same URL',
        from: '/de/c/shoes-1?page=2',
        to: '/de/c/shoes-1?page=2',
        expectedPageViews: 1,
      },
      {
        label: 'does not fire a view_page on a hash-only change',
        from: '/de/c/shoes-1?page=2',
        to: '/de/c/shoes-1?page=2#top',
        expectedPageViews: 1,
      },
      {
        label: 'does not fire a view_page on an image view switch',
        from: '/de/c/shoes-1?page=2',
        to: '/de/c/shoes-1?page=2&imageView=type-a',
        expectedPageViews: 1,
      },
      {
        label:
          'does not fire a view_page on a switch back to the default image view',
        from: '/de/c/shoes-1?imageView=type-a&page=2',
        to: '/de/c/shoes-1?page=2',
        expectedPageViews: 1,
      },
    ])('$label', async ({ from, to, expectedPageViews }) => {
      await installOnPage(from)

      mocks.page.url = to
      await nextTick()

      expect(await pageViews()).toHaveLength(expectedPageViews)
    })

    it('reports the allowlisted query keys in page_path and previous_page_path', async () => {
      await installOnPage('/de/c/shoes-1?page=2&hash=secret')

      mocks.path = '/de/p/shoe-1'
      mocks.page.component = 'ProductDetail'
      mocks.page.url = '/de/p/shoe-1?variantId=7&cbd=token'
      await nextTick()

      expect((await pageViews())[1]).toMatchObject({
        page_path: '/de/p/shoe-1?variantId=7',
        previous_page_path: '/de/c/shoes-1?page=2',
      })
    })

    it('reports the previous page on the view_page a URL change fires', async () => {
      await installOnPage('/de/c/shoes-1')

      mocks.path = '/de/p/shoe-1'
      mocks.page.component = 'ProductDetail'
      mocks.page.url = '/de/p/shoe-1'
      await nextTick()

      expect((await pageViews())[1]).toMatchObject({
        page_type: 'product_detail',
        page_path: '/de/p/shoe-1',
        previous_page_path: '/de/c/shoes-1',
        previous_page_type: 'product_listing',
      })
    })
  })

  describe('session start', () => {
    it('stamps the landing page attribution on every event', async () => {
      windowStub.location = {
        href: `${ORIGIN}/de?utm_source=summer_ad&utm_medium=cpc&gclid=abc&token=secret`,
        origin: ORIGIN,
      }
      documentStub.referrer = 'https://www.google.com/'
      const { track } = install()

      track('view_page')
      track('add_to_basket', { product_id: 'p-1', price: PRICE, quantity: 1 })

      for (const body of await sentBodies()) {
        expect(body).toMatchObject({
          landing_page_path: '/de',
          utm_source: 'summer_ad',
          utm_medium: 'cpc',
          referrer: 'https://www.google.com/',
        })
        expect(body).not.toHaveProperty('utm_content')
        expect(body).not.toHaveProperty('utm_campaign')
        // Click identifiers and tokens travel only in the query string, which
        // the analytics store does not read.
        expect(body).not.toHaveProperty('query_string')
      }
    })

    it('reads the landing page at install, not the page an event fires on', async () => {
      const { track } = install()

      mocks.path = '/de/c/shoes-1'
      track('view_page')

      expect(await sentBody(0)).toMatchObject({
        page_path: '/de/c/shoes-1',
        landing_page_path: '/de/p/shoe-1',
      })
      expect(await sentBody(0)).not.toHaveProperty('query_string')
    })

    it('stores nothing while the CMP loads and stores the sent session once consent arrives', async () => {
      const consentManager = loadingConsentManager()
      const { track } = install()

      track('view_page')
      expect(storage.size).toBe(0)

      reportConsent(consentManager)
      await nextTick()

      expect(storedSession()).toMatchObject({
        id: (await sentBody(0)).session_id,
        start: { landing_page_path: '/de/p/shoe-1' },
      })
    })

    it('starts a clean session on the current page an hour after the last sent event', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      windowStub.location = {
        href: `${ORIGIN}/de?utm_source=summer_ad`,
        origin: ORIGIN,
      }
      documentStub.referrer = 'https://www.google.com/'
      const { track } = install()

      track('view_page')
      // The tab stays open for an hour without an event.
      vi.setSystemTime(Date.now() + HOUR_MS)
      mocks.randomUUID.mockReturnValue('session-2')
      mocks.path = '/de/c/shoes-1'
      track('view_page')

      expect(await sentBody(0)).toMatchObject({
        session_id: 'session-1',
        utm_source: 'summer_ad',
      })
      expect(await sentBody(1)).toMatchObject({
        session_id: 'session-2',
        landing_page_path: '/de/c/shoes-1',
      })
      expect(await sentBody(1)).not.toHaveProperty('utm_source')
      expect(await sentBody(1)).not.toHaveProperty('referrer')
    })

    it('keeps the stored session while the CMP loads and removes it when the report declines', async () => {
      storage.set(SESSION_KEY, '{"id":"stored"}')
      const consentManager = loadingConsentManager()
      install()
      await nextTick()
      expect(storage.has(SESSION_KEY)).toBe(true)

      reportConsent(consentManager, false)
      await nextTick()

      expect(storage.has(SESSION_KEY)).toBe(false)
    })

    it('keeps the page load session readable after a decline without storing it', async () => {
      const consentManager = loadingConsentManager()
      install()

      reportConsent(consentManager, false)
      await nextTick()

      expect(readAnalyticsSession()).toMatchObject({
        id: 'session-1',
        start: { landing_page_path: '/de/p/shoe-1' },
      })
      expect(storage.size).toBe(0)
    })

    it('removes the stored session when consent is withdrawn', async () => {
      storage.set(SESSION_KEY, '{"id":"stored"}')
      const consentManager = loadingConsentManager()
      reportConsent(consentManager)
      install()

      consentManager.state[VENDOR_ID] = false
      await nextTick()

      expect(storage.has(SESSION_KEY)).toBe(false)
    })
  })

  describe('delivery', () => {
    it('keeps a refused beacon at the head of the queue and sends the queue in order on the next flush', async () => {
      // Each capture retries the head of the queue, so the quota has to refuse
      // three times for three events to pile up.
      mocks.sendBeacon
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValue(true)
      const { track } = install()

      track('view_page')
      track('view_product_detail', { product_id: 'p-1', price: PRICE })
      track('view_product_detail', { product_id: 'p-2', price: PRICE })
      expect(mocks.sendBeacon).toHaveBeenCalledTimes(3)
      expect(await sentBody(2)).toMatchObject({ event_name: 'view_page' })

      documentStub.dispatchEvent(new Event('visibilitychange'))

      expect(mocks.sendBeacon).toHaveBeenCalledTimes(6)
      expect(await sentBody(3)).toMatchObject({ event_name: 'view_page' })
      expect(await sentBody(4)).toMatchObject({ product_id: 'p-1' })
      expect(await sentBody(5)).toMatchObject({ product_id: 'p-2' })
    })

    it('flushes queued events on pagehide', async () => {
      mocks.sendBeacon.mockReturnValueOnce(false).mockReturnValue(true)
      const { track } = install()

      track('view_page')
      windowStub.dispatchEvent(new Event('pagehide'))

      expect(mocks.sendBeacon).toHaveBeenCalledTimes(2)
      expect(await sentBody(1)).toMatchObject({ event_name: 'view_page' })
    })

    it('drops an event over the body cap and sends the events behind it', async () => {
      const consentManager = loadingConsentManager()
      const { track } = install()

      // No list to trim: only a free-form field can push an event over the
      // cap, which the typed call signature does not admit.
      ;(track as (eventName: string, properties: object) => void)('view_page', {
        page_title: 'x'.repeat(ANALYTICS_MAX_EVENT_BODY_BYTES),
      })
      track('view_product_detail', { product_id: 'p-1', price: PRICE })
      reportConsent(consentManager)
      await nextTick()

      expect(await sentBodies()).toEqual([
        expect.objectContaining({ event_name: 'view_product_detail' }),
      ])
      expect(mocks.warn).toHaveBeenCalledExactlyOnceWith({
        message: 'SCAYLE Analytics event dropped, body over the size cap',
        eventName: 'view_page',
      })
    })

    it('still posts to the analytics route in dev mode', async () => {
      vi.stubEnv('DEV', true)
      const { track } = install()

      track('view_page')

      expect(mocks.sendBeacon).toHaveBeenCalledOnce()
      expect(await sentBody(0)).toMatchObject({ event_name: 'view_page' })
    })
  })

  it('provides the API on the server without touching browser globals', () => {
    vi.stubGlobal('window', undefined)
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('navigator', undefined)

    const { track } = install()

    expect(() => track('view_page')).not.toThrow()
    expect(mocks.provide).toHaveBeenCalledTimes(1)
    expect(vi.mocked(whenever)).not.toHaveBeenCalled()
    expect(mocks.sendBeacon).not.toHaveBeenCalled()
  })
})

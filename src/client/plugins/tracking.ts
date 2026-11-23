import type { App } from 'vue'
import { computed, watch } from 'vue'
import { usePage } from '@client/composables/usePage'
import type { PagePropsOf } from '@client/composables/usePage'
import {
  resolveTrackingDeviceType,
  resolveTrackingPageType,
  toTrackedPath,
  toTrackedUrl,
} from '@shared/utils/tracking'
import type {
  PageType,
  TrackingContext,
  TrackingUserType,
} from '@shared/types/Tracking'
import { routes } from '@shared/routes'
import { localizeLink } from '@scayle/storefront/shared'
import { whenever } from '@vueuse/core'
import { useGlobalEvents } from '@client/composables/tracking/useGlobalEvents'
import { useRoute } from '@client/composables/useRoute'
import { usePageMeta } from '@client/composables/usePageMeta'
import { getConsentManagerInstance } from '@client/plugins/consentManager'
import { readAnalyticsSession } from '@client/plugins/analyticsSession'
import { IMAGE_VIEW_QUERY_KEY } from '@shared/constants/imageView'
import type { Customer } from '@scayle/storefront/types'
import type { PageComponentName } from '@scayle/storefront'
import { TRACKING_INJECTION_KEY } from '@client/plugins/trackingKey'
import type { TrackingPlugin } from '@client/plugins/trackingKey'

/**
 * The pages {@link resolvePageTypeId} reads an identifier from. Naming them
 * rather than re-declaring their prop shapes ties the reads below to the
 * `Components` registry, so a renamed page prop is a compile error here instead
 * of an identifier that silently turns `undefined`.
 */
type TrackedPageName =
  | 'ProductDetail'
  | 'ProductListing'
  | 'Search'
  | 'CmsPage'
  | 'OrderSuccess'
  | 'AccountOrderDetail'

/**
 * Derives a page-specific identifier from the current Inertia page props.
 * Returns `undefined` when the page type has no meaningful id.
 */
const resolvePageTypeId = (
  componentName: PageComponentName | undefined,
  pageProps: PagePropsOf<TrackedPageName>,
): string | undefined => {
  switch (componentName) {
    case 'ProductDetail':
      return pageProps.product?.id?.toString()
    case 'ProductListing':
      return pageProps.category?.id?.toString()
    case 'Search':
      return pageProps.term
    case 'CmsPage':
      return pageProps.slug
    case 'OrderSuccess':
    case 'AccountOrderDetail':
      return pageProps.order?.id?.toString()
  }

  return undefined
}

/**
 * Classifies the customer for `user_type`: `guest` without an account, `new`
 * while the account is in the `new` customer group, `returning` otherwise.
 */
const resolveUserType = (customer: Customer | null): TrackingUserType => {
  if (!customer) {
    return 'guest'
  }
  return customer.groups.includes('new') ? 'new' : 'returning'
}

/**
 * Creates the GA4 tracking plugin.
 *
 * Wires up two things:
 * - Provides the `push` API for composables. An event is captured with the
 *   page fields of its moment and pushed to `window.dataLayer` once the
 *   deferred `customer` prop has resolved, so no event reaches GTM without the
 *   customer fields of its session. The rest of the `context` is stamped at
 *   that push; `docs/GA4-TRACKING.md` ("Context model") names the source of
 *   every field. `session_id`, `landing_page_path`, the `utm_*` fields and
 *   `referrer` come from the SCAYLE Analytics session that
 *   `createAnalyticsPlugin` starts at install, so they are absent where that
 *   plugin is not installed.
 * - Watches the Inertia page URL: the initial page assignment emits the first
 *   `page_view`, and every later URL change (visits, visits served from the
 *   prefetch cache, browser back and forward, and query-only changes such as
 *   pagination and filters) shifts current to previous and emits a new
 *   `page_view`.
 *
 * The GTM loader itself is injected by `SFAnalyticsHead.vue` when `config.publicFields.gtmId`
 * is set, so the plugin is safe to install unconditionally.
 *
 * @example
 * ```ts
 * createSSRApp({ render: () => h(App, props) })
 *   .use(inertiaPlugin)
 *   .use(createTrackingPlugin())
 *   .mount(el)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager
 */
export function createTrackingPlugin(): {
  install: (app: App) => void
} {
  return {
    install(app: App) {
      let previousPagePath: string | undefined
      let previousPageType: PageType | undefined

      const inertiaPage = usePage<TrackedPageName>()
      const { path, query } = useRoute()
      const { currentTitle } = usePageMeta()

      const consentManager = getConsentManagerInstance()

      // Events captured before the deferred `customer` prop resolved, each with
      // the page fields of its moment, so a held event keeps its page.
      const queue: {
        payload: Record<string, unknown>
        pageContext: Partial<TrackingContext>
      }[] = []

      // The bare Error page shares no `storefront` prop, and it is not the
      // start page either.
      const resolvePageType = () => {
        const { storefront } = inertiaPage.props
        return resolveTrackingPageType(
          inertiaPage.component,
          !!storefront && path.value === localizeLink(storefront, routes.home),
        )
      }

      const currentPage = () => ({
        page_type: resolvePageType(),
        page_path: toTrackedPath(path.value, query.value),
      })

      // `customer` is deferred: `undefined` until its request resolves,
      // `null` once signed out. The bare Error page shares no props at all,
      // so there is no context until the next storefront page.
      const buildContext = (): TrackingContext | undefined => {
        const { customer, storefront } = inertiaPage.props
        if (customer === undefined) {
          return undefined
        }

        const session = readAnalyticsSession()
        // A guest checkout customer has a session customer but no account to
        // sign in to, so it is neither logged in nor identified.
        const isLoggedIn = !!customer && !customer.isGuest
        return {
          // A country without consent management runs no consent platform,
          // so there is no id to report. Without the consent manager plugin
          // there is no way to tell, and the field stays as if it were pending.
          consent_id:
            consentManager?.consentManagementRequired === false
              ? undefined
              : (consentManager?.consentId.value ?? ''),
          session_id: session?.id,
          user_id: isLoggedIn ? customer.idHash : undefined,
          user_type: resolveUserType(customer),
          login_state: customer ? 'logged_in' : 'logged_out',
          ...Object.fromEntries(
            (customer?.groups ?? []).map(
              (group) => [`customer_segment_${group}`, true] as const,
            ),
          ),
          device_type: resolveTrackingDeviceType(navigator.userAgent),
          shop_country_id: storefront.country.shopCountryId,
          shop_key: storefront.config.shopKey,
          country_code: storefront.country.countryCode,
          locale: storefront.country.locale,
          shop_currency: storefront.country.currency.currencyCode,
          shop_version: storefront.config.version,
          landing_page_path: session?.start.landing_page_path,
          utm_source: session?.start.utm_source,
          utm_medium: session?.start.utm_medium,
          utm_campaign: session?.start.utm_campaign,
          utm_content: session?.start.utm_content,
          referrer: session?.start.referrer,
          ...currentPage(),
        }
      }

      const flush = () => {
        const context = buildContext()
        if (!context || queue.length === 0) {
          return
        }

        const dataLayer = (window.dataLayer ??= [])
        for (const { payload, pageContext } of queue.splice(0)) {
          // Clear any previous `ecommerce` payload so items from prior events
          // do not leak into the next one (GTM best practice).
          if ('ecommerce' in payload) {
            dataLayer.push({ ecommerce: null })
          }
          dataLayer.push({
            ...payload,
            context: { ...context, ...pageContext },
          })
        }
      }

      const push: TrackingPlugin['push'] = (event) => {
        if (typeof window === 'undefined') {
          return
        }

        const page = currentPage()

        const payload: Record<string, unknown> = { ...event }

        // GTM's built-in page_view trigger reads these as top-level dataLayer
        // keys, not from inside the nested context object. `page_location`
        // keeps only the query keys on the tracking allowlist and loses its
        // fragment: the address bar can hold a credential, and GTM forwards
        // this value to GA4.
        if (event.event === 'page_view') {
          payload.page_type = page.page_type
          payload.page_type_id = resolvePageTypeId(
            inertiaPage.component,
            inertiaPage.props,
          )
          payload.page_location = toTrackedUrl(window.location.href)
          // The `document.title` fallback only holds on the initial page load.
          // On a client-side visit Inertia writes the new `<title>` on a timer,
          // after this runs, so a page without `PageMetaHead` (`Error`, a CMS
          // page without meta) reports the previous page's title.
          payload.page_title = currentTitle.value || document.title
        }

        queue.push({
          payload,
          pageContext: {
            ...page,
            previous_page_path: previousPagePath,
            previous_page_type: previousPageType,
          },
        })
        flush()
      }

      // provide must run unconditionally: useTracking() calls inject() during
      // SSR, and a missing key causes a logged error on every server render.
      app.provide(TRACKING_INJECTION_KEY, {
        push,
        // `buildContext` reads `navigator` and `localStorage`.
        context: computed(() =>
          typeof window === 'undefined' ? undefined : buildContext(),
        ),
      })

      if (typeof window === 'undefined') {
        return
      }
      // Resolved inside the app context per page view, so `useGlobalEvents()`
      // can inject what it needs after every plugin is installed.
      const trackPageView = () =>
        app.runWithContext(() => useGlobalEvents().trackPageView())

      // Path and page type of the last page_view, forwarded as
      // previous_page_path / previous_page_type by the next one.
      let lastNavPath: string | undefined
      let lastNavPageType: PageType | undefined
      let viewedUrl: string | undefined

      // The image view switch only reorders the tiles the listing already
      // shows, so its query key does not make a new page, the same rule the
      // SCAYLE Analytics `view_page` follows.
      const currentUrl = () => {
        const url = new URL(inertiaPage.url, window.location.origin)
        url.searchParams.delete(IMAGE_VIEW_QUERY_KEY)
        return url.pathname + url.search
      }

      // Drains the events captured while the deferred `customer` prop loaded.
      // `props` is `undefined` until the page is assigned, like `url`.
      whenever(() => inertiaPage.props?.customer !== undefined, flush)

      // Follows the page, not Inertia's request events: a prefetch fires
      // `finish` without leaving the page, and a visit served from the prefetch
      // cache arrives without one. `page.url` is undefined at install, so the
      // initial page assignment fires the first `page_view`; afterwards it moves
      // on every visit, on a partial reload that moves the URL (pagination,
      // filters, sorting) and on browser back and forward. `post` lets the new
      // page's `PageMetaHead` set the title first.
      watch(
        () => inertiaPage.url,
        () => {
          const nextUrl = currentUrl()
          if (nextUrl === viewedUrl) {
            return
          }
          viewedUrl = nextUrl

          previousPagePath = lastNavPath
          previousPageType = lastNavPageType
          lastNavPath = toTrackedPath(path.value, query.value)
          lastNavPageType = resolvePageType()

          trackPageView()
        },
        { flush: 'post' },
      )
    },
  }
}

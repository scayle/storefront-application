import type { App } from 'vue'
import { watch } from 'vue'
import { whenever } from '@vueuse/core'
import {
  ANALYTICS_EVENTS_PATH,
  ANALYTICS_MAX_EVENT_BODY_BYTES,
  ANALYTICS_MAX_LIST_ITEMS,
  createLogger,
  localizeLink,
} from '@scayle/storefront/shared'
import type {
  AnalyticsClientContext,
  AnalyticsClientEvent,
  AnalyticsEventProperties,
  AnalyticsPageType,
  AnalyticsSessionStartContext,
} from '@scayle/storefront-api'
import consentVendorConfig from '@client/consent-vendor.config.json' with { type: 'json' }
import { usePage } from '@client/composables/usePage'
import { IMAGE_VIEW_QUERY_KEY } from '@shared/constants/imageView'
import { useRoute } from '@client/composables/useRoute'
import { getConsentManagerInstance } from '@client/plugins/consentManager'
import { ANALYTICS_INJECTION_KEY } from '@client/plugins/analyticsKey'
import type { AnalyticsTrackFunction } from '@client/plugins/analyticsKey'
import {
  initAnalyticsSession,
  removeStoredAnalyticsSession,
  touchAnalyticsSession,
} from '@client/plugins/analyticsSession'
import { routes } from '@shared/routes'
import {
  resolveTrackingDeviceType,
  resolveTrackingPageType,
  toTrackedPath,
} from '@shared/utils/tracking'

const log = createLogger('analytics')

/**
 * Upper bound for events waiting on the CMP's first report, on a storefront
 * page, or on a free beacon slot. Beyond it the oldest event is dropped. The
 * cap sits far above the burst a page load queues while the CMP loads, so
 * reaching it means the CMP never reported.
 */
export const MAX_QUEUED_EVENTS = 1000

/** Context fields the dispatcher stamps in `flush()`, not at capture. */
type HandOffKey =
  | 'consent_id'
  | 'session_id'
  | 'device_type'
  | keyof AnalyticsSessionStartContext

/**
 * Event waiting in the dispatcher queue: the event properties plus the page
 * context the browser knows at capture. `consent_id`, the session and
 * `device_type` are stamped at hand-off, so a required context field added to
 * the contract later fails to compile for a queued event instead of shipping
 * as `undefined`.
 */
export type QueuedAnalyticsEvent = AnalyticsEventProperties &
  Omit<AnalyticsClientContext, HandOffKey>

const utf8 = new TextEncoder()

/**
 * Serializes an event for the request body, stopping `products` at the limits
 * the route enforces. `view_basket` carries one entry per basket line, so a
 * large basket used to build a body the route answered 413 to, losing the
 * event whole rather than sending it short. Trimming here rather than in the
 * composable that builds the event is what makes the budget exact: the caller
 * passes `products` before any context is on the event, `track()` adds the
 * page context and `flush()` the session, its start attribution and the
 * consent id, which range from a bare page path to a landing URL's full set
 * of `utm_*` values. No fixed reserve for them is both safe and tight, and a
 * fixed entry count is not safe at all, since `promotion_ids` alone admits
 * 200 entries per product. The trim stays visible without a contract change,
 * since every entry carries the full line count in `total`.
 *
 * @param event The event as the dispatcher queues it, without the context
 *   fields `flush()` stamps at hand-off
 * @returns The JSON body, or `undefined` when the body is over the cap with
 *   nothing left to trim, which only an oversized free-form field can cause.
 *   A refused beacon goes back to the head of the queue, so a body that can
 *   never fit the in-flight budget would block every event behind it for the
 *   rest of the page's life. The route would answer 413 to it anyway.
 */
export function serializeEvent(
  event: AnalyticsClientEvent,
): string | undefined {
  const body = JSON.stringify(event)
  const fits = utf8.encode(body).length <= ANALYTICS_MAX_EVENT_BODY_BYTES
  if (!('products' in event)) {
    return fits ? body : undefined
  }
  if (fits && event.products.length <= ANALYTICS_MAX_LIST_ITEMS) {
    return body
  }

  const products: typeof event.products = []
  let bytes = utf8.encode(JSON.stringify({ ...event, products: [] })).length
  if (bytes > ANALYTICS_MAX_EVENT_BODY_BYTES) {
    return undefined
  }

  for (const product of event.products) {
    if (products.length === ANALYTICS_MAX_LIST_ITEMS) {
      break
    }
    // One extra byte for the comma this entry needs once it is not the first.
    bytes += utf8.encode(JSON.stringify(product)).length + 1
    if (bytes > ANALYTICS_MAX_EVENT_BODY_BYTES) {
      break
    }
    products.push(product)
  }

  return JSON.stringify({ ...event, products })
}

/**
 * Creates the SCAYLE Analytics plugin, the browser dispatcher behind
 * `useAnalytics()`.
 *
 * Separate from the GA4 `createTrackingPlugin`: the two plugins fire as
 * independent calls from the same composables, speak different event
 * vocabularies, gate on different consent vendors, and trigger their page
 * views on their own. Both report a page view per URL change, query string
 * included: GA4 a `page_view`, SCAYLE Analytics a `view_page`. The `imageView`
 * parameter is the one exception: an image view switch only reorders the
 * tiles the page already shows. The plugin fires `view_page` itself, so no
 * GA4 navigation rule can suppress it.
 *
 * Events are gated on the `scayle-analytics` consent vendor and held, not
 * dropped, while the CMP is still loading. `docs/SCAYLE-ANALYTICS.md`
 * describes the consent gate, which fields the dispatcher stamps on each
 * event, and where a rejected event shows up.
 *
 * Every event is one `navigator.sendBeacon` request, which the browser keeps
 * alive across a tab close and a navigation. An event leaves the queue before
 * it is handed to `sendBeacon` and only returns, at the head, when the browser
 * refused the beacon because its in-flight budget is exhausted. A beacon the
 * browser accepted is not retried: the Storefront API ingest is at-least-once
 * without a client event id, so a retry could duplicate. The queue also
 * flushes on `pagehide` and `visibilitychange`, never on `unload` or
 * `beforeunload`, which are unreliable on mobile and break the back-forward
 * cache.
 *
 * Install after `createConsentManagerPlugin`: the consent manager instance is
 * captured at install time, and without one the gate fails closed.
 *
 * @example
 * ```ts
 * createSSRApp({ render: () => h(App, props) })
 *   .use(createConsentManagerPlugin(), { consentManagementRequired })
 *   .use(createUserCentricsAdapterPlugin())
 *   .use(createTrackingPlugin())
 *   .use(createAnalyticsPlugin())
 *   .mount(el)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/scayle-analytics
 */
export function createAnalyticsPlugin(): {
  install: (app: App) => void
} {
  return {
    install(app: App) {
      const page = usePage()
      const { path, query } = useRoute()
      const consentManager = getConsentManagerInstance()

      const scayleAnalyticsId = consentVendorConfig['scayle-analytics']

      /**
       * Events captured but not yet handed to `sendBeacon`: waiting on the
       * CMP's first report, on a storefront page, or on a free beacon slot.
       * The session and the consent id are stamped at hand-off.
       */
      const queue: QueuedAnalyticsEvent[] = []

      /**
       * Page of the last `view_page` and the one before it. `view_page` fires
       * once per URL change (see the trigger below), so it is the navigation
       * marker: every event reports the page before the current one as
       * `previous_page_*`.
       */
      let currentPage: { path: string; type: AnalyticsPageType } | undefined
      let previousPage: typeof currentPage

      // Fails closed when the consent manager plugin is missing: without it
      // there is no way to tell whether the country requires consent. The
      // consent id is required alongside the vendor flag because the route
      // rejects consent-country events without one.
      const hasConsent = () =>
        consentManager !== null &&
        (!consentManager.consentManagementRequired ||
          (consentManager.state[scayleAnalyticsId] === true &&
            !!consentManager.consentId.value))

      // Before the CMP's first report a missing grant is a loading state, not
      // a decision, so events are held rather than dropped. Only an adapter
      // that sets the flag can put the gate in this state; without one the
      // gate stays binary.
      const cmpPending = () => consentManager?.cmpPending.value === true

      const flush = () => {
        if (queue.length === 0) {
          return
        }

        if (!hasConsent()) {
          // The CMP has not reported yet: keep the events for the flush the
          // report itself triggers.
          if (cmpPending()) {
            return
          }

          // Consent declined or withdrawn between capture and hand-off: the
          // held events are dropped, not sent later.
          log.debug({
            message: 'SCAYLE Analytics queue dropped, no user consent given',
            droppedEvents: queue.length,
          })
          queue.length = 0
          return
        }

        // `track()` only enqueues on a page with storefront context, but the
        // flush can run after a navigation to the bare-bones Error page, which
        // has none. The events stay queued until a storefront page is back.
        const storefront = page.props.storefront
        if (!storefront) {
          return
        }

        const session = touchAnalyticsSession(path.value)
        // Picked by name: the stored entry may carry more than an event may
        // send, such as the contract's `query_string`.
        const {
          landing_page_path,
          utm_content,
          utm_medium,
          utm_source,
          utm_campaign,
          referrer,
        } = session.start
        const deviceType = resolveTrackingDeviceType(navigator.userAgent)
        const url = localizeLink(storefront, ANALYTICS_EVENTS_PATH)
        let event = queue.shift()

        while (event) {
          const clientEvent: AnalyticsClientEvent = {
            landing_page_path,
            utm_content,
            utm_medium,
            utm_source,
            utm_campaign,
            referrer,
            ...event,
            consent_id: consentManager?.consentId.value,
            session_id: session.id,
            device_type: deviceType,
          }
          const body = serializeEvent(clientEvent)
          if (body === undefined) {
            log.warn({
              message: 'SCAYLE Analytics event dropped, body over the size cap',
              eventName: event.event_name,
            })
            event = queue.shift()
            continue
          }

          const accepted = navigator.sendBeacon(
            url,
            new Blob([body], { type: 'application/json' }),
          )
          if (!accepted) {
            // The beacon quota is exhausted. Keep the event for the next
            // flush instead of losing it.
            queue.unshift(event)
            return
          }

          event = queue.shift()
        }
      }

      const track: AnalyticsTrackFunction = (eventName, ...[properties]) => {
        if (typeof window === 'undefined') {
          return
        }

        if (!hasConsent() && !cmpPending()) {
          log.debug({
            message: 'SCAYLE Analytics event dropped, no user consent given',
            eventName,
          })
          return
        }

        // The bare-bones Error page renders without storefront context, so
        // there is no shop to attribute the event to.
        const storefront = page.props.storefront
        if (!storefront) {
          log.debug({
            message: 'SCAYLE Analytics event dropped, no storefront context',
            eventName,
          })
          return
        }

        const pageType = resolveTrackingPageType(
          page.component,
          path.value === localizeLink(storefront, routes.home),
        )
        const pagePath = toTrackedPath(path.value, query.value)
        if (eventName === 'view_page') {
          previousPage = currentPage
          currentPage = { path: pagePath, type: pageType }
        }
        const context: Omit<AnalyticsClientContext, HandOffKey> = {
          page_type: pageType,
          page_path: pagePath,
          previous_page_path: previousPage?.path,
          previous_page_type: previousPage?.type,
        }
        // The discriminated union cannot be assembled generically without a
        // cast. The call signature already ties `properties` to `eventName`.
        const event = {
          ...properties,
          ...context,
          event_name: eventName,
        } as QueuedAnalyticsEvent

        if (queue.length >= MAX_QUEUED_EVENTS) {
          queue.shift()
          log.warn({
            message: 'SCAYLE Analytics queue full, oldest event dropped',
          })
        }
        queue.push(event)
        flush()
      }

      // provide must run unconditionally: useAnalytics() calls inject()
      // during SSR, and a missing key causes a logged error on every render.
      app.provide(ANALYTICS_INJECTION_KEY, { track })

      if (typeof window === 'undefined') {
        return
      }

      if (consentManager === null) {
        log.warn({
          message:
            'Consent manager plugin not installed, SCAYLE Analytics events stay gated off',
        })
      } else if (consentManager.consentManagementRequired) {
        // A misconfigured setup reads exactly like a user who declined:
        // `hasConsent()` wants `state[id] === true` and a consent id, and
        // neither holds either way. The consent id marks the end of a CMP
        // report (the shipped adapter sets it after the vendor loop), so a
        // report split across ticks does not read as a missing vendor. Where
        // consent management is not required the gate is open whatever the
        // CMP reports, so there is nothing to diagnose.
        whenever(
          () =>
            !!consentManager.consentId.value ||
            consentManager.state[scayleAnalyticsId] === true,
          () => {
            if (consentManager.state[scayleAnalyticsId] === undefined) {
              log.warn({
                message:
                  'Consent vendor id configured for SCAYLE Analytics is unknown to the consent manager, no event will ever be sent',
                vendorId: scayleAnalyticsId,
              })
            } else if (
              consentManager.state[scayleAnalyticsId] === true &&
              !consentManager.consentId.value
            ) {
              log.warn({
                message:
                  'Consent manager granted SCAYLE Analytics without a consent id, no event will ever be sent',
                vendorId: scayleAnalyticsId,
              })
            }
          },
          { once: true },
        )

        // The CMP's first report decides what happens to the events held
        // while it loaded: `flush()` sends them when the report granted
        // consent and drops them when it did not.
        watch(() => consentManager.cmpPending.value, flush)

        // A decline or a withdrawal removes the stored session: the entry
        // exists only under consent. Not `immediate`: an adapter that never
        // sets `cmpPending` reads as declined at install, before it reports.
        whenever(
          () => !hasConsent() && !cmpPending(),
          removeStoredAnalyticsSession,
        )
      }

      initAnalyticsSession(window.location, document.referrer)

      document.addEventListener('visibilitychange', flush)
      window.addEventListener('pagehide', flush)

      // Path and query of the Inertia page URL. The hash is left out: an
      // anchor jump is not a page view, and Inertia appends the hash to
      // `page.url` on hydration. So is the image view parameter: switching
      // the view on a listing only reorders the tiles the page already shows.
      const currentUrl = () => {
        const url = new URL(page.url, window.location.origin)
        url.searchParams.delete(IMAGE_VIEW_QUERY_KEY)
        return url.pathname + url.search
      }

      // `page.url` is undefined at install: every plugin installs before the
      // Inertia `App` component assigns the initial page, so that assignment
      // fires the first `view_page`. Afterwards Inertia updates `page.url` on
      // every visit, on a partial reload that moves the URL, and on browser
      // history.
      let viewedUrl: string | undefined
      watch(
        () => page.url,
        () => {
          const nextUrl = currentUrl()
          if (nextUrl === viewedUrl) {
            return
          }
          viewedUrl = nextUrl
          track('view_page')
        },
      )
    },
  }
}

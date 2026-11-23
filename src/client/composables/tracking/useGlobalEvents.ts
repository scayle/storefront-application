import { TrackingEventNames } from '@shared/types/Tracking'
import type { TrackingEvent } from '@shared/types/Tracking'
import { useTracking } from './useTracking'

/**
 * Tracks global events that are not tied to a specific domain (basket, checkout, product).
 *
 * All helpers are no-ops on the server: the underlying `push` only writes to `window.dataLayer`
 * when running in the browser.
 *
 * @returns Functions for tracking global events.
 *
 * @example
 * ```ts
 * const { trackPageView } = useGlobalEvents()
 *
 * trackPageView()
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useGlobalEvents() {
  const { push } = useTracking()

  /**
   * Tracks the GA4 `page_view`. The GA4 tracking plugin fires it automatically when
   * Inertia assigns the initial page and whenever the page URL changes, query string
   * included, so PLP pagination, filters and sorting count. A change of the `imageView`
   * query key alone, a partial reload that keeps the URL and a prefetch push nothing.
   * Manual calls are only needed for tests or specialized navigation handling.
   *
   * The SCAYLE Analytics `view_page` is not fired here: the SCAYLE Analytics dispatcher
   * (`createAnalyticsPlugin`) triggers it on its own, per URL change, so a GA4
   * navigation rule cannot suppress it.
   *
   * @param data Extra fields to merge into the GA4 event.
   *
   * @example
   * ```ts
   * trackPageView()
   * ```
   */
  const trackPageView = (data?: Partial<TrackingEvent>) => {
    push({ event: TrackingEventNames.PageView, ...data })
  }

  return {
    trackPageView,
  }
}

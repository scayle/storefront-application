import { inject } from 'vue'
import { createLogger } from '@scayle/storefront/shared'
import { ANALYTICS_INJECTION_KEY } from '@client/plugins/analyticsKey'
import type { AnalyticsTrackFunction } from '@client/plugins/analyticsKey'

const log = createLogger('analytics')

/**
 * Provides the `track` function for SCAYLE Analytics events.
 *
 * The SCAYLE Analytics counterpart of `useTracking()`: the same event-family
 * composables call both, one after the other, with their own vocabularies.
 * `track` takes one of the 15 canonical spec event names and that event's own
 * properties. The plugin adds the client context, applies the consent gate and
 * delivers the event to the same-origin analytics route.
 *
 * No-op on the server. Logs an error when the plugin is not installed.
 *
 * @returns Object with the `track` function.
 *
 * @example
 * ```ts
 * const { track } = useAnalytics()
 *
 * track('add_to_basket', {
 *   product_id: '206095',
 *   variant_id: '39549851',
 *   price: 8995,
 *   quantity: 1,
 * })
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/scayle-analytics
 */
export function useAnalytics(): { track: AnalyticsTrackFunction } {
  const tracking = inject(ANALYTICS_INJECTION_KEY)

  const track: AnalyticsTrackFunction = (eventName, ...properties) => {
    if (!tracking) {
      log.error({ message: 'SCAYLE Analytics plugin not installed' })
      return
    }

    tracking.track(eventName, ...properties)
  }

  return { track }
}

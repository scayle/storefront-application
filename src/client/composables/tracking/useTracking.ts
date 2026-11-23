import { inject } from 'vue'
import { TRACKING_INJECTION_KEY } from '@client/plugins/trackingKey'
import type { TrackingEvent } from '@shared/types/Tracking'
import { createLogger } from '@scayle/storefront/shared'

const log = createLogger('tracking')

/**
 * Provides a `push` function for tracking events via `window.dataLayer`.
 *
 * The shared `context` (shop, user, session, page classification) is merged automatically by
 * the tracking plugin. Callers only pass the event name and any event-specific payload
 * (e.g. `currency`, `value`, `ecommerce.items`).
 *
 * No-op on the server. Logs an error when the tracking plugin is not installed.
 *
 * @example
 * ```ts
 * const { push } = useTracking()
 *
 * push({
 *   event: 'add_to_cart',
 *   currency: 'EUR',
 *   value: 29.99,
 *   ecommerce: { items: [{ item_id: '123', quantity: 1 }] },
 * })
 * ```
 *
 * @returns `push` sends an event to the dataLayer. `context` is the current page's tracking
 * context for the `tracking-context` attribute of the checkout web components, `undefined`
 * without the tracking plugin (see `TrackingPlugin.context`).
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager
 */
export function useTracking() {
  const tracking = inject(TRACKING_INJECTION_KEY)

  const push = (event: Partial<TrackingEvent>) => {
    if (!tracking) {
      log.error({ message: 'Tracking plugin not installed' })
      return
    }

    tracking.push(event)
  }

  return { push, context: tracking?.context }
}

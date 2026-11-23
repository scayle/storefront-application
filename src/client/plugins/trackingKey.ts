import type { ComputedRef, InjectionKey } from 'vue'
import type { TrackingContext, TrackingEvent } from '@shared/types/Tracking'

/**
 * Public API of the tracking plugin, exposed via `inject()` to composables and components.
 *
 * Composables should prefer `useTracking()` over injecting this directly.
 */
export interface TrackingPlugin {
  /**
   * Pushes an event to `window.dataLayer`.
   *
   * The plugin merges the current GA4 `context` (shop, session, page classification)
   * into the payload. Callers only need to provide the event name and any event-specific
   * fields.
   *
   * No-op on the server. No-op when the dataLayer is unavailable.
   */
  push: (event: Partial<TrackingEvent>) => void
  /**
   * The GA4 `context` for the current page, the value of the `tracking-context`
   * attribute of the SCAYLE web components. `undefined` until the deferred
   * `customer` prop has resolved, and on the server. The session fields come from
   * storage that Vue does not track, so after a session rotation this keeps the
   * old `session_id` until the page, customer or consent id changes. Unlike a
   * pushed event, it carries no `previous_page_path` or `previous_page_type`.
   */
  context: ComputedRef<TrackingContext | undefined>
}

/** Injection key for the tracking plugin. */
export const TRACKING_INJECTION_KEY: InjectionKey<TrackingPlugin> =
  Symbol('tracking')

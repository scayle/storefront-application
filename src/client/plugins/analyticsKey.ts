import type { InjectionKey } from 'vue'
import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
} from '@scayle/storefront-api'

/**
 * Event-specific properties of one SCAYLE Analytics event, without the
 * `event_name` discriminator the dispatcher adds itself.
 */
export type AnalyticsTrackProperties<N extends AnalyticsEventName> = Omit<
  Extract<AnalyticsEventProperties, { event_name: N }>,
  'event_name'
>

/**
 * Captures one SCAYLE Analytics event and delivers it to the same-origin
 * analytics route.
 *
 * Drops the event when the SCAYLE Analytics vendor has no consent or the
 * consent manager has no consent id yet, on a page without storefront context
 * (the bare-bones Error page). Holds it while the CMP has not reported yet.
 * No-op on the server.
 *
 * @param eventName One of the canonical SCAYLE Analytics event names.
 * @param properties That event's own properties. Omitted for events that
 *   carry none, such as `view_page`.
 */
export type AnalyticsTrackFunction = <N extends AnalyticsEventName>(
  eventName: N,
  ...properties: keyof AnalyticsTrackProperties<N> extends never
    ? []
    : [AnalyticsTrackProperties<N>]
) => void

/**
 * Public API of the SCAYLE Analytics plugin, exposed via `inject()`.
 *
 * Composables should prefer `useAnalytics()` over injecting this directly.
 */
export interface AnalyticsPlugin {
  /** Captures one SCAYLE Analytics event, see {@link AnalyticsTrackFunction}. */
  track: AnalyticsTrackFunction
}

/** Injection key for the SCAYLE Analytics plugin. */
export const ANALYTICS_INJECTION_KEY: InjectionKey<AnalyticsPlugin> =
  Symbol('analytics')

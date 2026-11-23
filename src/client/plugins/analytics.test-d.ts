/**
 * Type-level assertions for the `track` signature of the SCAYLE Analytics
 * plugin.
 *
 * Checked by `pnpm typecheck`, because the file is inside the tsconfig
 * `include`, and a failing `@ts-expect-error` is itself an error.
 *
 * What it pins down:
 *
 * 1. An event without own properties takes the name alone.
 * 2. An event with own properties requires exactly those properties.
 * 3. A property outside the event's contract does not compile.
 * 4. A queued event is not the wire event: the hand-off fields are missing.
 */
import type { AnalyticsClientEvent, CentAmount } from '@scayle/storefront-api'
import type { QueuedAnalyticsEvent } from './analytics'
import type { AnalyticsTrackFunction } from './analyticsKey'

declare const track: AnalyticsTrackFunction
declare const price: CentAmount
declare const queued: QueuedAnalyticsEvent

// 1. `view_page` carries no properties of its own.
track('view_page')
// @ts-expect-error An empty properties object is not accepted for `view_page`.
track('view_page', {})

// 2. `add_to_basket` requires the flattened product.
track('add_to_basket', {
  product_id: '206095',
  variant_id: '39549851',
  price,
  quantity: 1,
})
// @ts-expect-error `price` is required on `add_to_basket`.
track('add_to_basket', { product_id: '206095', variant_id: '1', quantity: 1 })
// @ts-expect-error The properties argument cannot be omitted for `add_to_basket`.
track('add_to_basket')

// 3. A key from another event does not compile.
track('view_product_detail', {
  product_id: '206095',
  price,
  // @ts-expect-error `search_term` belongs to the search events.
  search_term: 'shoe',
})

// 4. `consent_id`, `session_id`, `device_type` and the session start fields are
// stamped at hand-off.
// @ts-expect-error A queued event lacks the hand-off fields of the wire event.
export const wire: AnalyticsClientEvent = queued
export const queuedViewPage: QueuedAnalyticsEvent = {
  event_name: 'view_page',
  page_type: 'homepage',
  page_path: '/de',
  // @ts-expect-error `session_id` is not known at capture.
  session_id: 'session-1',
}

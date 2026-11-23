# SCAYLE Analytics

The SCAYLE Resource Center covers [SCAYLE Analytics](https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/scayle-analytics) and its [events](https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/scayle-analytics/scayle-analytics-events).

SCAYLE Analytics sends behavioral events from the Storefront Application to the SCAYLE Storefront
API. It is a second pipeline next to the GA4 / Google Tag Manager tracking described in
[Tracking](./GA4-TRACKING.md): the same event-family composables (`useProductEvents`,
`useBasketEvents`, and so on) call both pipelines one after the other, with their own vocabularies.
Nothing links the two, and neither knows about the other. The page view is the exception in trigger
only: the dispatcher fires `view_page` itself on every URL change, and the GA4 tracking plugin fires
the GA4 `page_view` through `useGlobalEvents` on its own watch of the same URL (see
[Page views](#page-views)).

This document covers what a tenant developer needs: how an event travels from the browser to the
Storefront API, how the browser keeps the session, the consent manager entry you have to add, how
consent gates the pipeline, the development fail-safe, why there is no on/off switch, what your shop
configuration and your deployment each own, and how to check that events flow. The list
of events and when each fires lives in the
[SCAYLE Analytics event list](./GA4-TRACKING.md#scayle-analytics-event-list).

## Architecture and flow

```
composable ──► useAnalytics().track() ──► dispatcher plugin ──► POST /api/analytics/events ──► AnalyticsForwardService ──► Storefront API
 (browser)                                   (browser)              (Storefront Application server)                        (SCAYLE)
```

| Step       | Where                                                                                                                             | What it does                                                                                                                                                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Composable | `src/client/composables/tracking/*`                                                                                               | Decides that something happened (a basket add, a product tile became visible) and calls `track(eventName, properties)` from `useAnalytics()`.                                                                                                                                                                                        |
| Dispatcher | `src/client/plugins/analytics.ts`                                                                                                 | Fires `view_page` per URL change, applies the consent gate, stamps `page_type`, `page_path`, the previous page, the browser session and its start attribution, queues the event, and sends it with `navigator.sendBeacon`, one request per event. A beacon the browser refuses goes back to the head of the queue for the next send. |
| Route      | `mountAnalyticsRoute` from `@scayle/storefront` (mounted in `src/server/index.ts`)                                                | Same-origin `POST /api/analytics/events`, mounted bare and under the country prefix. Checks the `Origin` header against the public origin, validates every field against the contract, strips unknown keys, and answers `202`. Takes the shop's consent policy as an `isConsentRequired` callback.                                   |
| Forward    | `AnalyticsForwardService` from `@scayle/storefront/services` (service slot `analytics`, registered in `src/server/registries.ts`) | Completes the event with the session customer through the `analytics` mapper slot and submits it via `storefrontAPI.analytics.submitEvent`. Rejects on a mapper or Storefront API failure, which the route logs. Not retried. Skipped in dev mode (`import.meta.env.DEV`).                                                           |
| Contract   | `@scayle/storefront-api`, `src/endpoints/analytics/events.ts`                                                                     | The event union, page types and device types. Both the dispatcher and the route type against it, so the browser and server cannot drift apart.                                                                                                                                                                                       |

The browser never talks to the Storefront API directly, so the Storefront API token stays on the
server. The dispatcher builds the route URL with `localizeLink(storefront, ANALYTICS_EVENTS_PATH)`,
which yields the right form for every country selector (`sendBeacon` cannot set the
`X-Shop-Country-Id` header the oRPC client uses).

Who sets which field:

| Field                                                                  | Set by     | When                                                                                                                                                      |
| ---------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event_name` and the event's own properties                            | composable | At capture                                                                                                                                                |
| `page_type`, `page_path`, `previous_page_*`                            | dispatcher | At capture, so a held event keeps the page it happened on                                                                                                 |
| `consent_id`, `session_id`, `device_type`                              | dispatcher | At send: `consent_id` from the consent manager, `session_id` from the [browser session](#session), `device_type` from `navigator.userAgent`               |
| `landing_page_path`, `utm_*`, `referrer`                               | dispatcher | At send, from the [browser session](#session): the values of the page the session started on, so a reload or a second tab does not move the session start |
| `customer_id`, `customer_type`, `customer_segments`, `customer_groups` | server     | From the session customer, never from the browser. `customer_segments` lists the `referenceKey` of each customer segment                                  |
| `shop_version`                                                         | server     | From `config.version` in `storefront.config.ts`                                                                                                           |

The contract's `query_string` is not sent: the analytics store does not read it, and a landing URL
can carry a password reset or CMS preview token. The route and `AnalyticsForwardService` strip it
from any caller that still sends one. Every query key beyond the four contract `utm_*` fields, click
identifiers such as `gclid` included, therefore stays out of SCAYLE Analytics. GA4 reports the same
four `utm_*` fields from the same [browser session](#session). The referrer is reported only when it points to
another origin. A direct entry, a hard reload or a link opened in a new tab names no session source.
The browser cuts the referrer at its `?` or `#`, and the route cuts `referrer` and
`landing_page_path` there again, so a caller that skips the dispatcher cannot store a token from the
referring page's query or fragment either.

## Page views

`view_page` fires on every change of the Inertia page URL, path or query string, hash excluded:
regular visits, partial reloads that move the URL (PLP pagination, filters and sorting), the
`?register=true` registration view of the sign-in page, and browser back and forward. A partial
reload that keeps the URL (deferred props, the post-login refresh) fires nothing, and neither does a
change of the `imageView` parameter alone: an image view switch on the PLP or the Search Results
Page only reorders the tiles the page already shows. The first
`view_page` fires when Inertia assigns the first page, without waiting for any deferred prop. Where
the consent manager is still loading, it waits in the queue for the first report like every other
event.

The dispatcher owns this trigger; `useGlobalEvents().trackPageView` fires the GA4 `page_view` only,
from the GA4 tracking plugin's own watch of the page URL. Both follow the same rule, every URL change
except an `imageView` switch, but neither depends on the other, so a GA4-side navigation rule cannot
swallow a SCAYLE Analytics page view.

## Session

The browser owns the SCAYLE Analytics session, in `src/client/plugins/analyticsSession.ts`. It keeps
one `localStorage` entry, `scayle-analytics-session`, with a random `id` sent as `session_id`, the
time of the last sent event (`lastEventAt`) and the session start attribution (`start`): the
landing path, the `utm_*` values and the referrer. Before each send the dispatcher reads the entry:
while the last event went out less than an hour ago, the event
carries the stored id and attribution, otherwise a new session starts. Reloads, new tabs, a login and
a logout therefore keep the session, and a new campaign inside it keeps the stored attribution, as
in GA4. A session a page load starts takes that page's landing path, `utm_*` values and referrer;
one that starts later in a tab left open takes the current path only.

The GA4 tracking plugin reads the same session through `readAnalyticsSession()`, which writes
nothing, for `session_id`, `landing_page_path`, the `utm_*` fields and `referrer`; see
[GA4-TRACKING.md](./GA4-TRACKING.md#context-model).

Consent gates only the entry. Each page load starts its session in memory at install: the stored
session while it is live, otherwise a new one with the page's landing values. The dispatcher writes
the entry when it sends, so only past the consent gate, and removes it when the user declines or
withdraws consent. The session of the page load stays in memory either way, so `readAnalyticsSession()`
returns it to a reader outside the SCAYLE Analytics consent, and no new session starts while the
consent manager loads. Only a send moves the session, so without consent it ends an hour after its
last sent event or the page load, each reload starts a new one, and a removal in another tab ends it
for the rest of the page load. Where the browser blocks `localStorage`, or a write fails on a full
quota, the session lives in memory and lasts one page load.

A withdrawal reaches only the tab it happens in. Another open tab keeps the grant its consent manager
reported and keeps sending. When the entry disappears, that tab drops its in-memory copy, so its next
send writes a new session rather than the old id. The key is not scoped by country, so with a `path`
country selector the session continues across a country switch, like the GA4 cookie, which is set
per domain.

## Consent manager entry

SCAYLE Analytics has its own vendor in the consent manager, separate from the Google Analytics
vendor. The Storefront Application reads the vendor id from the `scayle-analytics` key in
`src/client/consent-vendor.config.json`:

```json
{
  "scayle-analytics": "<vendorId>"
}
```

The json example shows both the consent vendor key (`scayle-analytics`, distinct from GA4-related
`google-analytics`) and the real Data Processing Service id for the boilerplate's Usercentrics
configuration. We commit that id so boilerplate and shared demo environments work against the
Usercentrics settings the app already loads (`publicFields.userCentricsAppId`) without a
fork-specific override. Tenant forks that use another Usercentrics configuration must replace the
value with the service id their CMP assigns. The consent manager matches CMP consent events against
this id; until it matches a vendor your CMP reports as granted, the gate stays closed in every
country that requires consent management.

The boilerplate uses one Usercentrics settings id (`publicFields.userCentricsAppId`) and the same
vendor ids in `consent-vendor.config.json` on every environment (local, staging, and production).
Tenant forks that run separate Usercentrics configurations need a `scayle-analytics` id per
configuration they load.

The id is specific to your Usercentrics configuration. Every other entry in the file is the id of a
service Usercentrics ships in its own database; SCAYLE Analytics is not in that database, so you add
it as a custom service (Usercentrics calls a vendor a Data Processing Service, DPS):

1. In the Usercentrics Admin Interface, open the configuration whose settings id the Storefront
   Application loads (`publicFields.userCentricsAppId`, see `SFAnalyticsHead.vue`).
2. Add a custom Data Processing Service named `SCAYLE Analytics`. Fill in the legal texts and the data
   processor details as your legal team specifies; the fields you enter here appear in the consent
   banner.
3. Copy the id Usercentrics assigns to the new service and paste it as the value of the
   `scayle-analytics` key in `src/client/consent-vendor.config.json`.
4. Publish the Usercentrics configuration and deploy the Storefront Application.

Nothing else has to change. The Usercentrics adapter (`src/client/plugins/userCentricsAdapter.ts`)
copies the consent state of every service in the configuration onto the consent manager, keyed by
service id, together with the visitor's controller id. The dispatcher looks up the `scayle-analytics`
key in that state.

If you use another consent management platform, its adapter has to do the same two things as the
Usercentrics one: set `consentManager.state[vendorId]` to `true` when the user has consented to the
SCAYLE Analytics vendor, and set `consentManager.consentId` to the platform's identifier for the
visitor's consent record. Both writes belong in the same reactive tick. The dispatcher reads the
consent id as the end of the CMP report, so a vendor granted a tick earlier reads as a grant that
will never carry an id and warns.

An adapter whose platform reports after the Vue app mounts also has to set `consentManager.cmpPending`
to `true` while its platform is loading and back to `false` with the first report, whether that
report grants anything or not. Until the platform has reported, a returning visitor whose decision it
already stored looks exactly like one who declined, and that is the window the flag covers: the
dispatcher holds events instead of dropping them, then sends or discards them once the flag clears.
Clear the flag in the same tick as the state the report carries, and only from a callback that
carries it. A bare "ready" hook that fires before the state is applied releases the held events
against an empty state, which drops them. Without the flag, the dispatcher reads the loading state as
a decline. The first `view_page` fires when Inertia assigns the first page, so an adapter that reports
later loses the landing `view_page` of every page load, logged only as a dropped event at `debug`.

The Usercentrics adapter clears the flag from `UC_CONSENT`, which Usercentrics dispatches as soon
as it initializes, for a returning visitor with a stored decision and for a first-time visitor who
has not answered the banner yet. That first report of an undecided visitor grants nothing, so
events captured before the banner is answered are dropped rather than held across it. When
Usercentrics initialized before the Vue app hydrated, the initial event is already gone, and the
adapter reads the same record back through `window.__ucCmp.getConsentDetails()`.

## Consent behavior

Two rules carry this pipeline's consent sign-off, and a change to either one needs that sign-off
revisited: no event is submitted before explicit consent, and an explicit decline clears the queue.
Everything below follows from those two.

- **Nothing is captured against a decision.** An event that fires once the CMP has reported and the
  SCAYLE Analytics vendor is not consented is dropped, logged at `debug`, and never replayed. The
  dispatcher buffers nothing past a decision it knows, which is what makes the model defensible:
  there is no data collected against a user's answer.
- **Events are held while the CMP loads.** Before the platform's first report the dispatcher cannot
  tell a returning visitor who already consented from one who declined, so an event captured in
  that window goes into the queue rather than being dropped. The first report decides: consent
  sends the held events, anything else discards them. This is a wait on a decision the visitor has
  already made, not collection ahead of one. Nothing leaves the browser until the report arrives,
  and an adapter that does not set `cmpPending` never enters this state. Held events are lost when
  the tab closes or a full-page navigation happens before the report arrives. That loss cannot
  shrink: sending them earlier would be collection ahead of a decision.
- **Decisions are per vendor.** Consent for Google Analytics does not imply consent for SCAYLE
  Analytics and the other way round. A user can accept one and reject the other.
- **The consent id is required alongside the flag.** Where consent management is required, the
  dispatcher sends only when the vendor flag is `true` and the consent manager holds a consent id.
  The Usercentrics adapter sets both from the same `UC_CONSENT` event. The consent id travels as
  `consent_id` and is the key for later data-removal requests.
- **A decision without consent drops held events.** Events waiting on the CMP's first report, or
  on a free beacon slot, are dropped when the vendor turns out not to be consented, whether that is a withdrawal or the report itself. The drop logs
  `SCAYLE Analytics queue dropped, no user consent given` at `debug` with the number of dropped events.
- **Countries without consent management skip the gate.** Where the resolved country's
  `publicFields.consentManagementRequired` is `false`, or the country has no `publicFields`, events
  fire without a consent check and without `consent_id`. The consent manager plugin still has to be
  installed: without one the dispatcher cannot tell which case applies and fails closed.
- **A consent country without a settings id sends nothing and says so at boot.** `.env.example`
  ships `STOREFRONT_USER_CENTRICS_APP_ID` empty while DE, AT and US require consent management.
  Without the id the Usercentrics loader never runs, so those countries hold every event up to the
  queue cap and keep express checkout gated, in a dev build as much as in production. The server
  logs a warning at startup naming the affected countries. Set the id, or set
  `consentManagementRequired` to `false` for a country that does not need consent management. The
  empty id is not a way to opt out of SCAYLE Analytics. A configured id whose loader never reports, for example behind an ad blocker, keeps
  holding events, because that user may have declined.
- **A vendor id the consent manager does not know is reported.** An id in
  `consent-vendor.config.json` that your CMP never reports looks exactly like a user who declined:
  the flag is not `true` either way, and every event is dropped in every country that requires
  consent management while the other countries keep reporting. Once the CMP has reported its consent
  id, which the shipped adapter sets after the vendor list, the dispatcher warns once per page load
  in the browser console with the configured `vendorId`. An adapter that reports its vendors in
  batches has to set `consentId` with the last one, or a partial report reads as a missing vendor.
- **Consent is granted without a consent id.** A CMP adapter that sets the vendor flag but never
  sets `consentId` fails the same way and for the same reason: the route refuses a consent-country
  event without the id. The dispatcher tells this apart from an unknown vendor id and warns once per
  page load with
  `Consent manager granted SCAYLE Analytics without a consent id, no event will ever be sent`.
- **The route re-checks the decision, not the configuration.** For a country that requires consent
  management, the route refuses an event without `consent_id` with `400`, whatever the browser did.
  Both gates read the same `country.publicFields.consentManagementRequired`, so that field is a
  single point of failure: set it to `false` for a country that does require consent management and
  both gates open, events are collected and forwarded without consent and without a `consent_id`,
  and nothing logs anything. The route protects against a browser that skipped the gate, not
  against a wrong value in the shared configuration.

## Checkout web components

The checkout web component sends its own funnel events to SCAYLE Analytics. `Checkout.vue` sets two
attributes on `<scayle-checkout>` for it, and `SignIn.vue` sets the second on `<scayle-auth>`.
Both need a checkout web component release that reads them (2.1.98 or later). An older release
ignores the attributes without an error and sends no events:

- **`consent`** carries `scayleAnalytics` next to `paypal` and `klarna`. The component sends events
  only for the JSON boolean `true`.
- **`tracking-context`** carries the GA4 `context` object from `useTracking().context`. It never
  enables or blocks an event.

While the consent platform loads, the checkout gets `scayleAnalytics: false` and drops its events,
where the dispatcher holds them. A funnel event from that window is lost. Delaying the checkout
until the platform reports would block it behind an ad blocker, and leaving `consent` off brings back
the all-true PayPal and Klarna default.

`tracking-context` has a similar window. It is absent until the deferred `customer` prop resolves,
which can be after the checkout mounts when the checkout script was already loaded on the basket
page. The component picks the context up only if it re-reads the attribute, so an event from that
window may carry no context.

## Development fail-safe

When the Storefront Application runs in development mode (`import.meta.env.DEV`, which is what
`pnpm dev` sets), the browser dispatcher still posts each event to `POST /api/analytics/events` and
the route still validates the body and answers `202`. `AnalyticsForwardService` is where the
fail-safe lives: it returns without calling the Storefront API, so a development session never
writes analytics data upstream.

A production build (`pnpm build`, `pnpm preview`) runs the full pipeline through the Storefront API.

The flag resolves at the build of the project that bundles `@scayle/storefront`, which is your
project, not ours. A deployment built in development mode therefore answers `202` on every event and
forwards none of them, in every country, and every browser-side check still passes. The skip is
logged at `warn` once per hour per process for as long as it lasts, naming the event that tripped it:

```
Development mode: SCAYLE Analytics events are accepted and not forwarded to the Storefront API.
```

That line is the only signal, so keep `STOREFRONT_LOG_LEVEL` at `warn` or lower in production.

## No enable or disable flag

There is deliberately no configuration flag that turns SCAYLE Analytics on or off. Consent is the
only gate. SCAYLE Analytics is part of the product, and a switch next to the consent gate would
create a second place where "is tracking active" is decided, with the two able to disagree.

What that means for you:

- **You cannot leave the vendor out to opt out in every country.** Without the vendor, nothing fires
  in countries that require consent management. In countries where `consentManagementRequired` is
  `false`, events fire regardless, because there is no consent to wait for.
- **You can remove the pipeline.** If your project must not send SCAYLE Analytics events at all, drop
  `createAnalyticsPlugin()` from `src/client/main.ts` and `src/client/ssr.ts` and remove the
  `mountAnalyticsRoute` call in `src/server/index.ts`. `useAnalytics()` then logs an
  error per call and does nothing; the event-family composables keep working for GA4. GA4 loses
  `session_id`, `landing_page_path`, the `utm_*` fields and `referrer`, which come from the session the plugin
  starts at install, unless `src/client/main.ts` calls
  `initAnalyticsSession(window.location, document.referrer)` in its place.
- **Rate limiting is yours.** See [What the deployment owns](#what-the-deployment-owns).

## What the shop chooses to send

These fields carry what your shop puts in them:

- **`page_path` and `previous_page_path`** are the path of the Inertia page with the query keys on
  the tracking allowlist (see [Tracked query keys](./GA4-TRACKING.md#tracked-query-keys)). The
  path itself is not filtered: a token, an order number or an email address in a **path segment**
  travels with every event fired on that page and is stored as analytics data. Keep secrets in a
  query key that is not on the allowlist or in the request body, never in a path. A query key your
  shop adds to the allowlist travels the same way.
- **`customer_groups`** and **`customer_segments`** come from the session customer and reach the
  mapper untouched, the segments as the reference key of each one. Customer groups and customer
  segments used for sensitive segmentation leave the shop as analytics data along with them.

## What the deployment owns

The route and the dispatcher cannot check any of these from the inside:

| Concern                | What it needs                                                                                                                                                                  | If it is wrong                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limit             | A per-client limit on `POST /api/analytics/events` at the CDN or WAF. The route is unauthenticated, applies no per-client limit and does not retry.                            | Anyone can post events, each costing a session read and a Storefront API call. One client can also fill the 16 forward slots and get other visitors' events dropped |
| CSP `connect-src`      | `'self'`, which `src/server/middleware/securityHeaders.ts` lists first. Dropping it while editing the policy blocks every beacon to the route.                                 | A CSP violation per event in the browser console, nothing server-side                                                                                               |
| Route order            | No catch-all redirect covering `/api/*`, and `mountAnalyticsRoute` before `sharedDataMiddleware` and `mountAPIRouter`.                                                         | The POST is redirected or never reaches the handler                                                                                                                 |
| `x-forwarded-proto`    | A TLS-terminating proxy has to send it, and `config.domain` / `country.domain` have to name the host the shop is actually served on, so the public origin matches the browser. | `403` on every event, with a server `warn` naming both origins once a minute                                                                                        |
| `STOREFRONT_LOG_LEVEL` | `warn` or lower. Every signal above is a `warn`, and the default is `info`, so setting the level to `error` in production removes all of them.                                 | A broken pipeline with no log line anywhere                                                                                                                         |

## Verifying events are flowing

Work through the list from the browser to the Storefront API. Each step has its own signal, so a
break shows up at exactly one place.

1. **The vendor id matches your CMP.** `src/client/consent-vendor.config.json` has the service id
   Usercentrics assigned to your SCAYLE Analytics Data Processing Service under `scayle-analytics`,
   not the boilerplate's committed id when your fork uses a different Usercentrics configuration.
   If it does not match, the browser console carries
   `Consent vendor id configured for SCAYLE Analytics is unknown to the consent manager` once, with
   the configured id. An adapter that grants the vendor but leaves `consentId` unset carries
   `Consent manager granted SCAYLE Analytics without a consent id` instead.
2. **Consent is given.** Open the consent banner, accept the SCAYLE Analytics service, and confirm
   the consent manager sees it: in the browser console, the `UC_CONSENT` event's `detail.services`
   map contains your vendor id with `consent.given: true`.
3. **Events leave the browser.** Under `pnpm dev` or a production build, the Network tab shows a
   `POST` to `/api/analytics/events` (or `/<country>/api/analytics/events` with the `path` country
   selector) after a navigation, answered with `202`. The request body carries `event_name`,
   `page_type`, `page_path`, `session_id`, `device_type` and, where consent is required,
   `consent_id`. Each request is a beacon, listed with type `ping` or `beacon` depending on the
   browser. GA4 events in `window.dataLayer` are a different pipeline and do not confirm SCAYLE
   Analytics is working.
4. **The route accepts them.** Any status other than `202` comes with a JSON body and a server log
   line under the `analytics` logger, `SCAYLE Analytics event not forwarded to the Storefront API`
   with a `reason` field naming the branch. That line is throttled: a reason logs at most once a
   minute, and the next line of the same reason carries a `suppressed` count of the ones in
   between, so a misconfigured deployment reports its size without writing a line per event.
   Expect one line rather than one per request while reproducing a rejection:

   | Status | Meaning                                                                                                                                                                                                                                                               |
   | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `400`  | No country context (bare path under the `path` selector), body not JSON, a contract violation (the `issues` array names the fields, at most ten of them, with `issueCount` carrying the total), or `consent_id` missing where the country requires consent management |
   | `403`  | The `Origin` header does not match the public request origin. Check the public origin configuration of the deployment; the log line prints both origins                                                                                                               |
   | `413`  | Body over the size cap                                                                                                                                                                                                                                                |

   The size cap is 32 KiB, half the 64 KiB in-flight budget a browser gives beacons per page,
   which the beacons Google Tag Manager sends share, so one event can never starve the events
   queued behind it. `view_basket` is the only event that can
   approach it: the dispatcher fills its `products` array against the cap and stops, rather than
   posting a body the route refuses. A trimmed array is visible in the
   request body without a field of its own, because every entry reports the full basket line count
   in its `total`: when `products.length` is below that `total`, the array was cut to fit. Any
   other event over the cap, which only an oversized free-form field can cause, never leaves the
   browser: the dispatcher drops it and logs `SCAYLE Analytics event dropped, body over the size cap`
   at `warn`, because a refused beacon goes back to the head of the queue and one that can never
   fit would block every event behind it.

   A value over its length cap is not a contract violation. The route cuts optional text to 256
   characters and drops an optional URL over 2048, so the event goes through without the tail or
   the URL. Only `page_path` and the identifiers every event needs (`session_id`, `consent_id`,
   `page_type`, a `products` entry's `product_id`) answer `400` over the cap.

5. **The forward succeeds.** In development mode, look for
   `Development mode: SCAYLE Analytics events are accepted and not forwarded to the Storefront API.`
   at `warn` on the server instead of a Storefront API call. Seeing that line from a deployment you
   built for production means the build ran in development mode and no event has ever reached the
   Storefront API. In a production build, a failed submission logs the throttled line above
   under `reason: 'forward-failed'`, with `err.name`, `err.message`, `err.stack` and, for a
   transport failure, `err.cause.message` and `err.cause.code`, once a minute with a `suppressed`
   count. A refused connection can leave `err.cause.message` empty, so read `err.cause.code`, for
   example `ECONNREFUSED`. A timeout of the ingest call logs `err.name: 'TimeoutError'` with no
   `err.cause`. A service or mapper your project registered that throws lands in the same line.
   The route answers `202` either way, since the browser never reads the response. A `202` with no
   `forward-failed` or `forward-limit` line for over a minute means forwards are going through.

   The route also stops forwarding once 16 forwards are in flight in the process, and logs the
   events it drops under `reason: 'forward-limit'` with `limit: 16`, again once a minute with a
   `suppressed` count. That line usually points at a slow or timing-out ingest, not at a pool that
   is too small, so look for the `TimeoutError` `forward-failed` line beside it before changing any
   size. Forwards share the outbound connection pool (`CONNECTIONS_PER_ORIGIN`, 32, in
   `src/server/outbound-dispatcher.ts`) with page rendering, and the limit keeps a hung ingest
   from holding every socket. `src/server/index.ts` passes half the pool as the
   `maxInFlightForwards` option of `mountAnalyticsRoute`, so resizing the pool moves the limit
   with it.

6. **Automated check.** `testing/playwright/tests/e2e/scayle-analytics.e2e.spec.ts` grants consent
   with a synthetic `UC_CONSENT` event (the same technique as manual QA when the CMP is blocked in
   tests), reads each event body from a wrapped `navigator.sendBeacon`, answers the route with
   `202`, and asserts the bodies for navigation, promotions, filters and session changes. It runs
   against `pnpm dev` or a production build.

The dispatcher also logs `SCAYLE Analytics queue full, oldest event dropped` at `warn` when more than
1000 events wait on the CMP's first report or a free beacon slot,
`SCAYLE Analytics event dropped, body over the size cap` at `warn` for an event too large to send, and
`SCAYLE Analytics queue dropped, no user consent given` at `debug` when held events are dropped because the
vendor is not consented, either after a withdrawal or on the CMP's first report. These are
browser-side signals; the route never sees those events. An event the route rejects leaves no line
in the browser console, since script cannot read a beacon's response: look for the route's `warn`
line from step 4, or for the request's status code in the DevTools Network panel.

## Related

- [Tracking](./GA4-TRACKING.md): the GA4 pipeline, the shared context model, and the
  [SCAYLE Analytics event list](./GA4-TRACKING.md#scayle-analytics-event-list)

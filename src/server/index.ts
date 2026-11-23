import { Hono } from 'hono'
import { compress } from 'hono/compress'
import {
  defaultOpenTelemetryConfig,
  opentelemetry,
} from '@scayle/storefront-opentelemetry'
import { onError } from '@orpc/client'
import {
  config,
  createStorefrontErrorHandler,
  createStorefrontNotFoundHandler,
  createStorefrontRuntime,
  mountAnalyticsRoute,
  mountAPIRouter,
  mountSSRRouter,
  registerHealthRoute,
  resolveClientIp,
  serveStaticAssets,
} from '@scayle/storefront'
import { createLogger } from '@scayle/storefront/shared'
import type { StorefrontVariables } from '@scayle/storefront'
import { setGlobalDispatcher } from 'undici'
import { parseCmsEnv } from '@cms-server/service'
import { ssrRouter } from './ssr-routes'
import { cmsCspMiddleware } from './cms/middleware/csp'
import { cmsPreviewRedirectMiddleware } from './cms/middleware/preview-redirect'
import { nosniffMiddleware } from './middleware/nosniff'
import { securityHeadersMiddleware } from './middleware/securityHeaders'
import { apiRouter } from './api'
import { sharedDataMiddleware } from './middleware/sharedData'
import { mapperRegistry, serviceRegistry } from './registries'
import {
  CONNECTIONS_PER_ORIGIN,
  createOutboundDispatcher,
} from './outbound-dispatcher'

setGlobalDispatcher(createOutboundDispatcher())

// Fails the boot, not the first CMS request, when a credential of the compiled-in
// provider is missing. The CMS service itself is created lazily per request.
parseCmsEnv()

const log = createLogger('server')

const app = new Hono<{
  Variables: StorefrontVariables
}>()

// Route uncaught request errors through the SDK error handler: structured
// logging plus the bare-bones Error page (rendered without shared props so a
// throwing shared once-prop cannot crash it). HTTPException passes through with
// its original status; errors before the Inertia middleware fall back to a
// generic message with no stack leak.
app.onError(createStorefrontErrorHandler())

// Replace this handler to change the 404 response for the whole application,
// or override `renderNotFound()` on a controller to change it for one page.
app.notFound(createStorefrontNotFoundHandler())

// Health probe for deployment platform readiness checks. Registered before
// any global middleware so it short-circuits without invoking storefront
// runtime, sessions, or other per-request work.
registerHealthRoute(app)

// Compression middleware that compresses all responses.
// Uses either gzip or deflate.
//
// Registered ahead of every other middleware so it also covers the responses
// of `serveStaticAssets`. That only matters in a production build:
// `serveStaticAssets` is a no-op under `vite dev`, where Vite's own middleware
// answers every asset request before it reaches this app. Deployments serve
// assets from an S3 bucket rather than from here, so the gain lands on
// `pnpm preview` and on any container serving its own assets.
//
// The health route is registered above this and stays uncompressed.
app.use(compress())

// `nosniff` for static assets too. See `nosniffMiddleware` for why this sits
// before `serveStaticAssets` while the full baseline sits after.
app.use(nosniffMiddleware)

// Serve built assets in production (no-op in dev — Vite serves `public/`).
serveStaticAssets(app)

// OpenTelemetry: instrument HTTP requests with spans and semantic attributes.
// Placed after serveStatic so static asset requests are not traced.
// `resolveClientAddress` is passed in rather than read by the package itself:
// @scayle/storefront-opentelemetry cannot statically import @scayle/storefront
// (it's bundled into the same Vite entry as `defaultPathFilter`, which loads
// before `virtual:storefront-config` is registered), so this boilerplate
// closes over `config` and hands the resolved value across as a plain string.
app.use(
  opentelemetry({
    ...defaultOpenTelemetryConfig,
    resolveClientAddress: (headers) => resolveClientIp(headers, config),
  }),
)

// Initializes the storefront context (config, API client, cache, session) for every request.
// Must be registered before any middleware that depends on ctx.get('storefront').
// The runtime mounts the registry middleware internally (right after the
// context middleware, before sharedData), so ctx.get('mappers') /
// ctx.get('services') are available to every downstream middleware and
// controller — sharedData reads the active campaign via services.campaigns.
app.use(createStorefrontRuntime({ mapperRegistry, serviceRegistry }))

// CMS editor/preview CSP adjustments (provider-specific via @cms-server alias).
// Registered on all routes because CMS content is rendered on `/` (homepage), `/c/*` and `/content/*`.
// The middleware short-circuits for non-preview requests with negligible overhead.
app.use('/*', cmsCspMiddleware)

// CMS preview redirects (provider-specific via @cms-server alias). Amplience opens
// a product listing page visualization on a placeholder path and passes the edited
// item's delivery key as a query parameter, so the request has to be redirected onto
// the real category route before it reaches the router. Providers that do not
// implement `getPreviewRedirectPath` make this a no-op.
app.use('/*', cmsPreviewRedirectMiddleware)

// Baseline security response headers (HSTS, nosniff, referrer policy,
// clickjacking protection, and a report-only CSP). Registered *after*
// `cmsCspMiddleware` so the CMS middleware's framing relaxation wins — see the
// `securityHeadersMiddleware` JSDoc for why the order inverts.
app.use(securityHeadersMiddleware)

// SCAYLE Analytics ingestion: a plain Hono route, not an oRPC procedure, so
// `navigator.sendBeacon` can post to it. Mounted bare and under `/:country`,
// since a beacon cannot send `X-Shop-Country-Id`. Registered before the oRPC
// mount so the request never enters oRPC's matching, and before
// `sharedDataMiddleware` because the route answers without rendering a page,
// so it has no use for shared props.
mountAnalyticsRoute(app, {
  // A country without `publicFields` reads as "no consent management", the
  // same default the browser gate applies in `src/client/main.ts`.
  isConsentRequired: (country) =>
    country.publicFields?.consentManagementRequired === true,
  // Forwards share the pool with page rendering, so a hung ingest can hold at
  // most half the sockets and page calls keep the rest.
  maxInFlightForwards: CONNECTIONS_PER_ORIGIN / 2,
})

// Without the Usercentrics settings id the CMP never loads, so every country
// that requires consent management holds each SCAYLE Analytics event and keeps
// express checkout gated. The only other sign of that is a queue-full warning
// in end users' browser consoles, which nobody watching the server sees.
const consentCountries = config.countries
  .filter((country) => country.publicFields?.consentManagementRequired)
  .map((country) => country.countryCode)
if (consentCountries.length > 0 && !config.publicFields?.userCentricsAppId) {
  log.warn({
    message: `STOREFRONT_USER_CENTRICS_APP_ID is empty but ${consentCountries.join(', ')} require consent management: SCAYLE Analytics sends nothing there and express checkout stays gated until the settings id is set.`,
  })
}

// Provides shared Inertia props (navigation, footer, basket, wishlist, user) to all pages.
app.use(sharedDataMiddleware)

// API routes (oRPC with OpenAPI support)
// Must be registered BEFORE the SSR router to avoid /:country matching /api
mountAPIRouter(app, apiRouter, {
  interceptors: [
    // Logs every oRPC error. A guest hitting a protected procedure is routine,
    // and so is an upstream rate limit, so `UNAUTHORIZED` and
    // `TOO_MANY_REQUESTS` log at warn and stop there. Everything else logs at
    // error with the full cause. Keeping rate limits off the error level is
    // what lets an alert on 5xx stay meaningful. The check reads the error
    // `code` (the typed value the `authed` middleware throws) rather than
    // matching a class, so it survives serialization across the RPC boundary.
    onError((error) => {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? error.code
          : undefined
      if (code === 'UNAUTHORIZED') {
        log.warn({ message: 'Unauthorized oRPC call' })
        return
      }
      if (code === 'TOO_MANY_REQUESTS') {
        log.warn({ message: 'Rate-limited oRPC call' })
        return
      }

      log.error({
        message: 'oRPC error',
        err: error instanceof Error ? error : new Error(String(error)),
        source: 'orpc',
      })
    }),
  ],
  specInfo: {
    title: 'Storefront RPCs',
    version: '1.0.0',
  },
  enableDocs: import.meta.env.DEV,
})

// Mount routes based on country selector
mountSSRRouter(app, ssrRouter)

// See https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/request-lifecycle
export default app

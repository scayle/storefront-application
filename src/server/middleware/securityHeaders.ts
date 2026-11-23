import { secureHeaders } from 'hono/secure-headers'
import { HTTPException } from 'hono/http-exception'
import { buildContentSecurityPolicyOptions } from '@scayle/storefront'
import {
  getCheckoutOrigin,
  getSubscriptionOrigin,
} from '@scayle/storefront/shared'
import type { StorefrontVariables } from '@scayle/storefront'
import type { StorefrontConfig } from '@scayle/storefront/config'
import type { MiddlewareHandler } from 'hono'
import { createMiddleware } from 'hono/factory'

/** Usercentrics CMP loader, injected by `SFAnalyticsHead.vue`. */
const USERCENTRICS_SCRIPT_ORIGIN = 'https://web.cmp.usercentrics.eu'

/**
 * Hosts the Usercentrics CMP calls with `fetch` or `sendBeacon` once loaded:
 * settings, consent storage, cross-domain consent retrieval, its error logger,
 * and event tracking. `api.usercentrics.eu` serves the settings of the previous
 * CMP version, which the loader fetches to migrate a consent that version
 * stored. The CMP's tracking pixel on `app.usercentrics.eu` is an image and
 * falls under `imgSrc`. In EU mode the CMP uses EU counterparts of these hosts
 * instead.
 */
const USERCENTRICS_API_ORIGINS = [
  'https://v1.api.service.cmp.usercentrics.eu',
  'https://consent-api.service.consent.usercentrics.eu',
  'https://consent-rt-ret.service.consent.usercentrics.eu',
  'https://graphql.usercentrics.eu',
  'https://uct.service.usercentrics.eu',
  'https://api.usercentrics.eu',
]

/** Google Tag Manager loader, injected by `SFAnalyticsHead.vue` when `gtmId` is set. */
const GOOGLE_TAG_MANAGER_ORIGIN = 'https://www.googletagmanager.com'

/**
 * Endpoints GTM-managed Google Analytics tags send hits to. GA4 routes some
 * regions through `region<n>.google-analytics.com` rather than the global host.
 */
const GOOGLE_ANALYTICS_ORIGINS = [
  'https://www.google-analytics.com',
  'https://analytics.google.com',
  'https://region1.google-analytics.com',
]

/**
 * CDN serving the checkout web component itself. The script at the checkout
 * origin is only a loader: it injects a second module script from here, which
 * then loads the component's stylesheet and fetches the address form's lookup
 * files (state options, postal code and city mappings) from the same host. Same
 * host for every project.
 */
const CHECKOUT_WEB_COMPONENT_CDN_ORIGIN = 'https://checkout-cdn.aboutyou.cloud'

/**
 * Klarna Payments SDK. Express checkout injects it on page view when Klarna is
 * an enabled payment method, before the customer picks any payment method. The
 * Klarna payment flow itself reaches further Klarna hosts, which are not listed.
 */
const KLARNA_SDK_ORIGIN = 'https://x.klarnacdn.net'

/**
 * Builds the `secureHeaders` options from the storefront config. The policy
 * returned below sets baseline security response headers on every SSR and API
 * response.
 *
 * The full Content-Security-Policy ships as **report-only**: it is announced to
 * the browser and violations surface, but nothing is blocked. Third-party tags
 * loaded through GTM pull in further origins that cannot be enumerated from
 * this repository — only violation reports from a real environment can complete
 * the list. Set `STOREFRONT_CSP_REPORT_URI` to collect them.
 * The rollout to enforcing is described in https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/security-headers.
 *
 * Known gaps while the policy is still report-only:
 * - The checkout web component bundles the payment provider SDKs (Adyen,
 *   Klarna, PayPal and a dozen more) and loads them into this document. Which
 *   ones a request activates depends on your enabled payment methods, so
 *   only the Klarna SDK host, which express checkout loads on page view, is
 *   listed below. Expect the rest in the first batch of reports, and add the
 *   active ones to `scriptSrc`, `frameSrc`, `connectSrc` and `formAction`
 *   before enforcing — the redirect-based flows (3DS, Klarna) post a
 *   cross-origin form, which `form-action 'self'` blocks.
 * - The checkout web component's stylesheet `@import`s Inter from Google Fonts,
 *   which reports against `style-src`. `https://fonts.googleapis.com` is left
 *   out on purpose: the storefront self-hosts Inter to avoid that third-party
 *   request, and enforcing `style-src` blocks it.
 * - The consent banner and the checkout web component inject inline `<style>`
 *   blocks. Those reports have no origin to add: the fix is a nonce, a hash, or
 *   accepting `'unsafe-inline'` on `styleSrc`.
 *
 * How the one policy below becomes the enforcing and report-only headers — the
 * report-only split, why `frameAncestors` is enforced from the start, the
 * violation-report wiring, and the dev-only Vite sources — is owned by
 * `buildContentSecurityPolicyOptions` in `@scayle/storefront`. This file only
 * declares the policy itself.
 *
 * `secureHeaders` writes its headers after `next()`, and that phase unwinds in
 * reverse registration order, so this middleware is registered *after*
 * `cmsCspMiddleware` in `src/server/index.ts` — otherwise it would overwrite the
 * CMS adjustments rather than being adjusted by them. Both sit after
 * `registerHealthRoute`, so the health probe carries none of these headers.
 *
 * Hono's `secureHeaders` also emits a set of defaults that are not spelled out
 * in the options below: `Origin-Agent-Cluster`, `X-DNS-Prefetch-Control`,
 * `X-Download-Options`, `X-Permitted-Cross-Domain-Policies` and
 * `X-XSS-Protection`. The two cross-origin isolation headers are set here
 * explicitly instead, because their defaults are too strict for the payment
 * flows the checkout web component drives.
 */
const buildSecurityHeadersMiddleware = (
  config: StorefrontConfig,
  subscriptionEnabled: boolean,
): MiddlewareHandler => {
  const checkoutOrigin = getCheckoutOrigin(config.tenantSpace)
  /**
   * Subscription addon origin, which serves the web component scripts and the
   * subscription API they call. Only allowed when the active country sets
   * `subscriptionEnabled`, so shops without the addon do not widen their policy.
   */
  const subscriptionOrigins = subscriptionEnabled
    ? [getSubscriptionOrigin(config.tenantSpace)]
    : []

  return secureHeaders({
    // Owned by the application, not by the deployment platform. A managed ingress
    // may send this header as well, and an identical duplicate is harmless, but
    // nothing outside this file guarantees it for projects hosting elsewhere.
    // Browsers ignore it over plain HTTP, so local development is unaffected.
    // `preload` is left off on purpose: it commits every subdomain to HTTPS and
    // is slow to undo, which is a call for whoever owns the domain.
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    // Framing is denied for every origin. This header and the enforced
    // `frame-ancestors` below both apply only to nested browsing contexts, so a
    // native mobile WebView that loads the storefront as its top-level document
    // is unaffected. A project that needs the storefront inside an actual iframe
    // (an app shell, a partner page) relaxes the two together, which
    // https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/security-headers describes.
    xFrameOptions: 'DENY',
    // Hono defaults both of these to `same-origin`. `same-origin` on the opener
    // policy severs `window.opener`, which the PayPal and Klarna popup flows
    // started from the checkout web component depend on, so popups are allowed
    // through. `cross-origin` on the resource policy keeps SSR responses
    // embeddable, which is what the CMS editor preview needs.
    crossOriginOpenerPolicy: 'same-origin-allow-popups',
    crossOriginResourcePolicy: 'cross-origin',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      // Express checkout renders in this document and pays through the Payment
      // Request API (Apple Pay, Google Pay), so `payment` is an allowlist rather
      // than a denial. Unlike the CSP there is no report-only stage here, and a
      // bare `payment=()` would silently remove the express checkout buttons.
      payment: ['self', checkoutOrigin],
      usb: [],
    },
    ...buildContentSecurityPolicyOptions({
      policy: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        formAction: ["'self'"],
        // Enforced from the start regardless of `enforcedDirectives`: framing is
        // the one control that cannot wait for the report-only rollout, because
        // `cmsCspMiddleware` removes `X-Frame-Options` on preview requests and
        // needs an enforced `frame-ancestors` to replace.
        frameAncestors: ["'none'"],
        scriptSrc: [
          "'self'",
          checkoutOrigin,
          CHECKOUT_WEB_COMPONENT_CDN_ORIGIN,
          KLARNA_SDK_ORIGIN,
          ...subscriptionOrigins,
          GOOGLE_TAG_MANAGER_ORIGIN,
          USERCENTRICS_SCRIPT_ORIGIN,
        ],
        // `style-src-attr` covers the `style` attributes produced by `:style`
        // bindings (`SFProgressBar`, `SFRangeSlider`, `SFDealRibbon`, and others).
        // A nonce does not apply to style attributes, so this cannot be tightened
        // without removing those bindings — but keeping the relaxation on the
        // attribute directive leaves inline `<style>` blocks under `style-src`.
        styleSrc: ["'self'", CHECKOUT_WEB_COMPONENT_CDN_ORIGIN],
        styleSrcAttr: ["'unsafe-inline'"],
        // The CMS media host differs per provider and per project, and the SCAYLE
        // image CDN is scoped to your shop. Images cannot execute, so allowing any HTTPS
        // origin here buys a working policy without weakening the script controls.
        imgSrc: ["'self'", 'data:', 'https:'],
        mediaSrc: ["'self'", 'https:'],
        // Fonts are self-hosted through `@fontsource-variable/inter`.
        fontSrc: ["'self'"],
        connectSrc: [
          "'self'",
          checkoutOrigin,
          CHECKOUT_WEB_COMPONENT_CDN_ORIGIN,
          ...subscriptionOrigins,
          GOOGLE_TAG_MANAGER_ORIGIN,
          ...GOOGLE_ANALYTICS_ORIGINS,
          ...USERCENTRICS_API_ORIGINS,
        ],
        // No third-party origin here: the checkout and subscription web components
        // are custom elements in this document, not frames. Nothing frames today,
        // so this matches the `default-src 'self'` fallback, but it is kept
        // explicit for two reasons. Payment redirect frames (3DS, Klarna) land on
        // this directive once reports name their origins, and
        // `buildContentSecurityPolicyOptions` only splits directives the policy
        // declares, so keeping the key makes enforcing it a one-entry edit to
        // `enforcedDirectives`.
        frameSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
      },
      // Rollout step 5 of the Security Headers page: once violation reports for
      // a directive come back clean, list it here to enforce it.
      enforcedDirectives: [],
      // Without a collector the report-only policy reports into end users'
      // browser consoles, where nobody sees it — which makes the rollout step it
      // exists for impossible to carry out.
      reportUri: process.env.STOREFRONT_CSP_REPORT_URI,
      dev: import.meta.env.DEV,
    }),
  })
}

/**
 * Builds `secureHeaders` from `ctx.get('config')` on every request, rather
 * than reading `config` from `@scayle/storefront` at module scope. The config
 * middleware sets `ctx.get('config')` for every request, and this middleware
 * registers after `createStorefrontRuntime(...)` in `src/server/index.ts`, so
 * `ctx.get('config')` is populated by the time this runs. Throws an
 * `HTTPException` with a registration-order hint if that ordering is ever
 * broken, so the failure logs at `error` (a plain `Error` here would log at
 * `warn`, the same as the `HTTPException` status is 5xx).
 *
 * The subscription origins come from the country in `ctx.get('storefront')`.
 * That context stays unset for requests that resolve no country (an `/api`
 * request without `x-shop-country-id`, a host no country matches in `'domain'`
 * mode), and those get the policy without the subscription origins, since no
 * subscription web component renders without a country.
 *
 * The options are a handful of array and object literals, so caching the built
 * middleware would buy nothing.
 */
export const securityHeadersMiddleware = createMiddleware<{
  Variables: StorefrontVariables
}>((ctx, next) => {
  const config = ctx.get('config')
  if (!config) {
    throw new HTTPException(500, {
      message:
        'securityHeadersMiddleware ran before createStorefrontRuntime(): ' +
        'ctx.get("config") is unset. Register it after ' +
        'createStorefrontRuntime(...) in src/server/index.ts.',
    })
  }
  const subscriptionEnabled =
    ctx.get('storefront')?.country.publicFields?.subscriptionEnabled === true
  return buildSecurityHeadersMiddleware(config, subscriptionEnabled)(ctx, next)
})

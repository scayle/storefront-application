import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import type { StorefrontVariables } from '@scayle/storefront'
import { createMockStorefrontContext } from '../../test/utils/context'
import type { MockStorefrontContextOverrides } from '../../test/utils/context'
import { securityHeadersMiddleware } from './securityHeaders'

const respond = async (
  middleware: MiddlewareHandler = securityHeadersMiddleware,
  storefrontOverrides: MockStorefrontContextOverrides = {},
) => {
  const storefront = createMockStorefrontContext(storefrontOverrides)
  const app = new Hono<{ Variables: StorefrontVariables }>()
  app.use((ctx, next) => {
    ctx.set('config', storefront.config)
    ctx.set('storefront', storefront)
    return next()
  })
  app.use(middleware)
  app.get('/', (ctx) => ctx.text('ok'))
  return app.request('/')
}

/**
 * Splits a CSP header into `directive -> sources`. `toContain` on the whole
 * header cannot tell which directive an origin landed in, and cannot notice a
 * directive disappearing entirely.
 */
const parseCsp = (header: string | null): Record<string, string[]> =>
  Object.fromEntries(
    (header ?? '')
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [directive, ...sources] = entry.split(/\s+/)
        return [directive, sources]
      }),
  )

const reportOnlyCsp = async (
  middleware?: MiddlewareHandler,
  storefrontOverrides?: MockStorefrontContextOverrides,
) =>
  parseCsp(
    (await respond(middleware, storefrontOverrides)).headers.get(
      'Content-Security-Policy-Report-Only',
    ),
  )

describe('securityHeadersMiddleware', () => {
  it('sets the baseline security headers', async () => {
    const response = await respond()

    // The HSTS lifetime is the one value here a project may tune.
    expect(response.headers.get('Strict-Transport-Security')).toMatch(
      /^max-age=\d+/,
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin',
    )
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('allows popups and cross-origin embedding, which hono denies by default', async () => {
    const response = await respond()

    // `same-origin` would sever `window.opener` for the PayPal and Klarna
    // popup flows the checkout web component starts.
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe(
      'same-origin-allow-popups',
    )
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe(
      'cross-origin',
    )
  })

  it('allowlists payment rather than denying it, so express checkout keeps working', async () => {
    const permissionsPolicy =
      (await respond()).headers.get('Permissions-Policy') ?? ''

    expect(permissionsPolicy).toContain('camera=()')
    expect(permissionsPolicy).toContain('payment=(self "https://')
    expect(permissionsPolicy).not.toContain('payment=()')
  })

  it('enforces frame-ancestors while the rest of the policy is report-only', async () => {
    const response = await respond()

    // Clickjacking protection cannot wait for the report-only rollout:
    // `cmsCspMiddleware` drops `X-Frame-Options` on preview requests and needs
    // an enforced `frame-ancestors` to replace.
    expect(parseCsp(response.headers.get('Content-Security-Policy'))).toEqual({
      'frame-ancestors': ["'none'"],
    })
    expect(
      response.headers.get('Content-Security-Policy-Report-Only'),
    ).toContain("default-src 'self'")
  })

  it('allows the third-party origins the storefront actually loads', async () => {
    const csp = await reportOnlyCsp()

    expect(csp['script-src']).toEqual(
      expect.arrayContaining([
        "'self'",
        'https://www.googletagmanager.com',
        'https://web.cmp.usercentrics.eu',
      ]),
    )
    expect(csp['script-src']).toContainEqual(
      expect.stringContaining('.checkout.api.scayle.cloud'),
    )
    expect(csp['script-src']).toContain('https://checkout-cdn.aboutyou.cloud')
    // Express checkout injects the Klarna SDK on page view.
    expect(csp['script-src']).toContain('https://x.klarnacdn.net')
    // The checkout web component loads its stylesheet and address form lookup
    // files from the CDN it is served from.
    expect(csp['style-src']).toContain('https://checkout-cdn.aboutyou.cloud')
    expect(csp['frame-src']).toContain("'self'")
    expect(csp['connect-src']).toEqual(
      expect.arrayContaining([
        'https://checkout-cdn.aboutyou.cloud',
        'https://www.google-analytics.com',
        'https://region1.google-analytics.com',
        // Usercentrics settings and consent storage, requested on the first
        // page view of every visitor.
        'https://v1.api.service.cmp.usercentrics.eu',
        'https://consent-api.service.consent.usercentrics.eu',
      ]),
    )
  })

  it('keeps the restrictive directives that have no third-party sources', async () => {
    const csp = await reportOnlyCsp()

    // A project adds its own origins to `form-action` and `font-src`
    // (see the Security Headers page of the SCAYLE Resource Center), so only their
    // `'self'` is pinned.
    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['base-uri']).toEqual(["'self'"])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['form-action']).toContain("'self'")
    expect(csp['font-src']).toContain("'self'")
    // `frame-ancestors` is ignored in a report-only policy, so it is only in the
    // enforcing one.
    expect(csp['frame-ancestors']).toBeUndefined()
  })

  it('relaxes inline styles only for style attributes, not for style blocks', async () => {
    vi.stubEnv('DEV', false)
    const csp = await reportOnlyCsp()

    expect(csp['style-src-attr']).toEqual(["'unsafe-inline'"])
    expect(csp['style-src']).toContain("'self'")
    expect(csp['style-src']).not.toContain("'unsafe-inline'")
  })

  it('drops the dev-only escape hatches from the production policy', async () => {
    vi.stubEnv('DEV', false)
    const csp = await reportOnlyCsp()

    expect(csp['script-src']).not.toContain("'unsafe-eval'")
    expect(csp['script-src']).not.toContain("'unsafe-inline'")
    expect(csp['connect-src']).not.toContain('ws://localhost:*')
    expect(csp['connect-src']).not.toContain('wss://localhost:*')
  })

  it('carries the dev-only escape hatches while Vite is serving modules', async () => {
    const csp = await reportOnlyCsp()

    expect(csp['script-src']).toEqual(
      expect.arrayContaining(["'unsafe-eval'", "'unsafe-inline'"]),
    )
    expect(csp['connect-src']).toContain('ws://localhost:*')
  })

  it('omits the reporting wiring when no collector is configured', async () => {
    const response = await respond()

    expect(response.headers.get('Reporting-Endpoints')).toBeNull()
    expect(
      response.headers.get('Content-Security-Policy-Report-Only'),
    ).not.toContain('report-')
  })

  it('points violation reports at the configured collector', async () => {
    vi.stubEnv('STOREFRONT_CSP_REPORT_URI', 'https://collector.example.com/csp')
    const response = await respond()

    expect(response.headers.get('Reporting-Endpoints')).toContain(
      'csp-endpoint="https://collector.example.com/csp"',
    )
    const csp = parseCsp(
      response.headers.get('Content-Security-Policy-Report-Only'),
    )
    expect(csp['report-to']).toEqual(['csp-endpoint'])
    // Firefox and Safari never implemented the Reporting API, so the
    // deprecated directive ships alongside it.
    expect(csp['report-uri']).toEqual(['https://collector.example.com/csp'])
  })

  it('adds the subscription hosts when the feature is configured', async () => {
    vi.stubEnv('DEV', false)
    const csp = await reportOnlyCsp(securityHeadersMiddleware, {
      config: { tenantSpace: 'acme' },
      country: {
        publicFields: {
          subscriptionEnabled: true,
          consentManagementRequired: false,
        },
      },
    })

    expect(csp['script-src']).toContain(
      'https://acme-subscription.addon.scayle.cloud',
    )
    expect(csp['connect-src']).toContain(
      'https://acme-subscription.addon.scayle.cloud',
    )
  })

  it('omits subscription origins when the feature is disabled for the shop', async () => {
    vi.stubEnv('DEV', false)
    const csp = await reportOnlyCsp(securityHeadersMiddleware, {
      config: { tenantSpace: 'acme' },
      country: {
        publicFields: {
          subscriptionEnabled: false,
          consentManagementRequired: false,
        },
      },
    })

    expect(csp['connect-src']).toContain("'self'")
    expect(csp['connect-src']).not.toContainEqual(
      expect.stringContaining('acme-subscription.addon.scayle.cloud'),
    )
    expect(csp['script-src']).not.toContainEqual(
      expect.stringContaining('acme-subscription.addon.scayle.cloud'),
    )
  })

  it('rebuilds the policy from the storefront context on every request, not just the first', async () => {
    const firstCsp = await reportOnlyCsp(securityHeadersMiddleware, {
      config: { tenantSpace: 'first-tenant' },
    })
    const secondCsp = await reportOnlyCsp(securityHeadersMiddleware, {
      config: { tenantSpace: 'second-tenant' },
    })

    expect(firstCsp['script-src']).toContainEqual(
      expect.stringContaining('first-tenant'),
    )
    expect(secondCsp['script-src']).toContainEqual(
      expect.stringContaining('second-tenant'),
    )
  })

  it('applies the policy without subscription origins when no country resolved', async () => {
    const { config } = createMockStorefrontContext({
      config: { tenantSpace: 'acme' },
    })
    const app = new Hono<{ Variables: StorefrontVariables }>()
    // The runtime leaves `storefront` unset for an `/api` request without
    // `x-shop-country-id`, while `config` is set for every request.
    app.use((ctx, next) => {
      ctx.set('config', config)
      return next()
    })
    app.use(securityHeadersMiddleware)
    app.post('/api/basket/add', (ctx) => ctx.json({}))

    const response = await app.request('/api/basket/add', { method: 'POST' })
    const csp = parseCsp(
      response.headers.get('Content-Security-Policy-Report-Only'),
    )

    expect(response.status).toBe(200)
    expect(csp['connect-src']).toContain("'self'")
    expect(csp['connect-src']).not.toContainEqual(
      expect.stringContaining('acme-subscription.addon.scayle.cloud'),
    )
  })

  it('throws with a registration-order hint when config is unset', async () => {
    const app = new Hono()
    app.use(securityHeadersMiddleware)
    app.get('/', (ctx) => ctx.text('ok'))

    // No setup middleware sets `config` here, simulating
    // `securityHeadersMiddleware` registered before `createStorefrontRuntime(...)`.
    const response = await app.request('/')

    expect(response.status).toBe(500)
    expect(await response.text()).toContain(
      'Register it after createStorefrontRuntime(...)',
    )
  })
})

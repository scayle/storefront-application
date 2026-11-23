import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import type { CMSProviderService } from '@scayle/storefront/cms'
import type { ServiceRegistry, StorefrontVariables } from '@scayle/storefront'
import { securityHeadersMiddleware } from '@server/middleware/securityHeaders'
import { createMockStorefrontContext } from '@test/utils/context'
import { cmsCspMiddleware } from './csp'

describe('cmsCspMiddleware', () => {
  it('lets the CMS editor frame the storefront through the real baseline', async () => {
    // The pairing that matters in production: `securityHeadersMiddleware` sets
    // an enforced `frame-ancestors 'none'` plus `X-Frame-Options: DENY`, and a
    // preview request has to come out the other side framable by the editor —
    // through the enforcing header, not only the report-only one. The
    // registration order matches `src/server/index.ts` — security headers last,
    // because the after-next phase unwinds in reverse.
    const cms: CMSProviderService = {
      // The shape every shipped provider has: framing plus the origins its
      // editor bridge needs.
      cspConfig: {
        directives: {
          'frame-ancestors': "'self' https://app.storyblok.com",
          'script-src': "'self' 'unsafe-inline' https://app.storyblok.com",
          'connect-src': "'self' https://api.storyblok.com",
        },
      },
      isEditorMode: vi.fn(() => true),
      getCMSEditorData: vi.fn(() => undefined),
      fetchPageData: vi.fn(),
      fetchListingPageData: vi.fn(),
    }
    const app = new Hono<{
      Variables: Pick<StorefrontVariables, 'config' | 'storefront'> & {
        services: ServiceRegistry
      }
    }>()
    app.use(async (ctx, next) => {
      const storefront = createMockStorefrontContext()
      ctx.set('config', storefront.config)
      ctx.set('storefront', storefront)
      ctx.set('services', { cms } as ServiceRegistry)
      await next()
    })
    app.use('/*', cmsCspMiddleware)
    app.use(securityHeadersMiddleware)
    app.get('/test', (ctx) => ctx.text('ok'))

    const res = await app.request('/test')

    expect(res.headers.get('X-Frame-Options')).toBeNull()
    // Framing only: the provider's script and connection origins must not turn
    // the enforcing header into an allowlist that blocks GTM and checkout.
    expect(res.headers.get('Content-Security-Policy')).toBe(
      "frame-ancestors 'self' https://app.storyblok.com",
    )
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toContain(
      "frame-ancestors 'self' https://app.storyblok.com",
    )
  })
})

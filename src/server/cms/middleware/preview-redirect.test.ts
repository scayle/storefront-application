import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import type { CMSProviderService } from '@scayle/storefront/cms'
import type { ServiceRegistry } from '@scayle/storefront'
import { cmsPreviewRedirectMiddleware } from './preview-redirect'

const createCmsService = (
  getPreviewRedirectPath?: CMSProviderService['getPreviewRedirectPath'],
): CMSProviderService => ({
  cspConfig: { directives: {} },
  isEditorMode: vi.fn(() => false),
  getCMSEditorData: vi.fn(() => undefined),
  fetchPageData: vi.fn(),
  fetchListingPageData: vi.fn(),
  getPreviewRedirectPath,
})

const createApp = (
  getPreviewRedirectPath?: CMSProviderService['getPreviewRedirectPath'],
  withServices = true,
) => {
  const app = new Hono<{ Variables: { services: ServiceRegistry } }>()

  // Simulate the registry middleware resolving the CMS service onto context.
  if (withServices) {
    app.use(async (ctx, next) => {
      ctx.set('services', {
        cms: createCmsService(getPreviewRedirectPath),
      } as ServiceRegistry)
      await next()
    })
  }

  app.use('/*', cmsPreviewRedirectMiddleware)
  app.get('/*', (ctx) => ctx.text('listing'))

  return app
}

describe('cmsPreviewRedirectMiddleware', () => {
  it('redirects to the path the provider resolves', async () => {
    const app = createApp(() => '/de/c/cms-preview-50350')
    const res = await app.request('/de/c/cms-preview-0?key=de-DE/c/c-50350')

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(
      '/de/c/cms-preview-50350?key=de-DE/c/c-50350',
    )
  })

  it('passes the request through when the provider resolves no path', async () => {
    const app = createApp(() => undefined)
    const res = await app.request('/de/c/women-123')

    expect(res.status).toBe(200)
  })

  it('passes the request through for a provider without a preview redirect', async () => {
    const app = createApp()
    const res = await app.request('/de/c/women-123')

    expect(res.status).toBe(200)
  })

  it('passes the request through when no country resolved, so no CMS service exists', async () => {
    const app = createApp(() => '/de/c/cms-preview-50350', false)
    const res = await app.request('/de/c/women-123')

    expect(res.status).toBe(200)
  })
})

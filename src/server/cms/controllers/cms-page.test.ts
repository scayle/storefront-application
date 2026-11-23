import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SSRRenderContext } from '@scayle/storefront'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
  createMockStorefrontCountry,
} from '../../../test/utils/context'
import { HOMEPAGE_SLUG } from '../constants'
import * as cmsService from '../providers/scayle/service'
import { CmsContentController, CmsHomepageController } from './cms-page'

const mockGetPageData = vi.fn()
const mockGetAlternatePaths = vi.fn()

function createMockRenderContext({
  slug,
  url = 'https://shop.example.com/content/homepage',
}: { slug?: string; url?: string } = {}): SSRRenderContext {
  const storefront = createMockStorefrontContext({
    country: { locale: 'en-GB', countryCode: 'GB' },
    config: {
      domain: 'shop.example.com',
      countrySelector: 'path',
      countries: [
        createMockStorefrontCountry({
          locale: 'en-GB',
          shopCountryId: 1,
          countryCode: 'GB',
          path: 'en',
          isDefault: true,
        }),
        createMockStorefrontCountry({
          locale: 'de-DE',
          shopCountryId: 2,
          countryCode: 'DE',
          path: 'de',
        }),
      ],
    },
  })

  return createMockSSRRenderContext({
    url,
    params: slug === undefined ? {} : { slug },
    variables: {
      storefront,
      mappers: createMockMapperRegistry(storefront),
      services: createMockServiceRegistry({
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
        cms: {
          fetchPageData: mockGetPageData,
          getAlternatePaths: mockGetAlternatePaths,
          isEditorMode: vi.fn(() => false),
          getCMSEditorData: vi.fn(() => undefined),
        },
      }),
    },
  })
}

/** Reads the props of the single `ctx.render` call. */
function renderedProps(ctx: SSRRenderContext) {
  return vi.mocked(ctx.render).mock.calls[0]![1] as Record<string, unknown>
}

beforeEach(() => {
  vi.spyOn(cmsService, 'getPageMeta')
})

describe('cmsContentController', () => {
  it('renders CmsPage with the page data fetched for the content slug', async () => {
    const pageData = { story: { id: 1, content: {} } }
    mockGetPageData.mockResolvedValue(pageData)
    vi.mocked(cmsService.getPageMeta).mockReturnValue({ title: 'Test' })

    const ctx = createMockRenderContext({ slug: 'about' })
    await new CmsContentController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith(
      'CmsPage',
      expect.objectContaining({ pageData, slug: 'content/about' }),
    )
    expect(mockGetPageData).toHaveBeenCalledWith(
      'content/about',
      ctx.get('request'),
    )
  })

  it('resolves hreflangs to the content page path for every configured country', async () => {
    const pageData = { story: { id: 1, content: {} } }
    mockGetPageData.mockResolvedValue(pageData)
    vi.mocked(cmsService.getPageMeta).mockReturnValue({ title: 'About' })

    const ctx = createMockRenderContext({ slug: 'about' })
    await new CmsContentController(ctx).view()

    const hreflangProp = renderedProps(ctx).hreflangs as {
      callback: () => unknown
    }
    const resolved = hreflangProp.callback()

    expect(resolved).toContainEqual({
      rel: 'alternate',
      hreflang: 'en-GB',
      href: 'https://shop.example.com/en/content/about',
    })
    expect(resolved).toContainEqual({
      rel: 'alternate',
      hreflang: 'de-DE',
      href: 'https://shop.example.com/de/content/about',
    })
  })

  it('builds the canonical link from the request URL', async () => {
    const pageData = { story: { id: 1, content: {} } }

    mockGetPageData.mockResolvedValue(pageData)
    vi.mocked(cmsService.getPageMeta).mockReturnValue({ title: 'About' })

    const ctx = createMockRenderContext({
      slug: 'about',
      url: 'https://shop.example.com/content/about',
    })
    await new CmsContentController(ctx).view()

    const meta = await (
      renderedProps(ctx).meta as () => Promise<Record<string, unknown>>
    )()
    expect(meta.canonicalLink).toMatchObject({
      href: 'https://shop.example.com/content/about',
    })
  })

  // The shop name reaches the meta only through the title fallback, so this is
  // the one check that the controller passes it on.
  it('titles the page with the shop name when the CMS entry has no title', async () => {
    mockGetPageData.mockResolvedValue({ story: { id: 1, content: {} } })
    vi.mocked(cmsService.getPageMeta).mockReturnValue({})

    const ctx = createMockRenderContext({ slug: 'about' })
    await new CmsContentController(ctx).view()

    const meta = await (
      renderedProps(ctx).meta as () => Promise<Record<string, unknown>>
    )()
    expect(meta.title).toBe('Test Shop')
  })

  it('sends no JSON-LD for non-homepage CMS pages', async () => {
    mockGetPageData.mockResolvedValue({ story: { id: 2, content: {} } })
    vi.mocked(cmsService.getPageMeta).mockReturnValue({ title: 'About' })

    const ctx = createMockRenderContext({ slug: 'about' })
    await new CmsContentController(ctx).view()

    expect(renderedProps(ctx)).not.toHaveProperty('jsonLd')
  })

  // Hono decodes percent-encoded characters, so an encoded `../` in the URL
  // reaches the route param as literal path segments.
  it.each([
    ['is missing', undefined],
    ['carries path segments', '../../datasources'],
    ['is a single dot', '.'],
    ['is a double dot', '..'],
  ])(
    'returns NotFound without fetching when the slug param %s',
    async (_case, slug) => {
      const ctx = createMockRenderContext({ slug })
      await new CmsContentController(ctx).view()

      expect(mockGetPageData).not.toHaveBeenCalled()
      expect(ctx.notFound).toHaveBeenCalledOnce()
    },
  )
})

describe('cmsHomepageController', () => {
  it('renders CmsPage with the page data fetched for the homepage slug', async () => {
    const pageData = { story: { id: 1, content: {} } }
    mockGetPageData.mockResolvedValue(pageData)

    const ctx = createMockRenderContext()
    await new CmsHomepageController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith(
      'CmsPage',
      expect.objectContaining({ pageData, slug: HOMEPAGE_SLUG }),
    )
    expect(mockGetPageData).toHaveBeenCalledWith(
      HOMEPAGE_SLUG,
      ctx.get('request'),
    )
  })

  it('sends the OnlineStore JSON-LD as a server-only prop', async () => {
    const pageData = { story: { id: 1, content: {} } }

    mockGetPageData.mockResolvedValue(pageData)
    vi.mocked(cmsService.getPageMeta).mockReturnValue({ title: 'Home' })

    const ctx = createMockRenderContext()
    await new CmsHomepageController(ctx).view()

    const jsonLd = renderedProps(ctx).jsonLd as {
      isServerOnly: boolean
      callback: () => Promise<unknown>
    }
    expect(jsonLd.isServerOnly).toBe(true)
    await expect(jsonLd.callback()).resolves.toEqual({
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      name: 'Test Shop',
      url: 'https://shop.example.com',
      logo: 'https://shop.example.com/logo.svg',
    })
  })

  it('renders the homepage without OnlineStore JSON-LD when the shop name cannot be read', async () => {
    mockGetPageData.mockResolvedValue({ story: { id: 1, content: {} } })
    vi.mocked(cmsService.getPageMeta).mockReturnValue({ title: 'Home' })

    const ctx = createMockRenderContext()
    vi.mocked(ctx.get('services')!.shopConfig.getShopName).mockResolvedValue(
      undefined,
    )
    await new CmsHomepageController(ctx).view()

    const props = renderedProps(ctx)
    const meta = await (props.meta as () => Promise<Record<string, unknown>>)()
    const jsonLd = props.jsonLd as { callback: () => Promise<unknown> }
    expect(meta.title).toBe('Home')
    await expect(jsonLd.callback()).resolves.toBeUndefined()
  })

  it('includes hreflangs for all configured countries on homepage', async () => {
    const pageData = { story: { id: 1, content: {} } }
    mockGetPageData.mockResolvedValue(pageData)
    vi.mocked(cmsService.getPageMeta).mockReturnValue({ title: 'Home' })

    const ctx = createMockRenderContext()
    await new CmsHomepageController(ctx).view()

    const hreflangProp = renderedProps(ctx).hreflangs as {
      callback: () => unknown
    }
    const resolved = hreflangProp.callback()

    expect(resolved).toContainEqual({
      rel: 'alternate',
      hreflang: 'en-GB',
      href: 'https://shop.example.com/en',
    })
    expect(resolved).toContainEqual({
      rel: 'alternate',
      hreflang: 'x-default',
      href: 'https://shop.example.com/en',
    })
    expect(resolved).toContainEqual({
      rel: 'alternate',
      hreflang: 'de-DE',
      href: 'https://shop.example.com/de',
    })
  })

  it('keeps homepage hreflangs at `/` when the provider returns root alternate paths', async () => {
    const pageData = { story: { id: 1, content: {} } }
    mockGetPageData.mockResolvedValue(pageData)
    vi.mocked(cmsService.getPageMeta).mockReturnValue({ title: 'Home' })
    // Storyblok `getAlternatePaths` normalizes `homepage` alternates to `/` so the
    // per-locale override must not reintroduce a `/homepage` segment into the URL.
    mockGetAlternatePaths.mockReturnValueOnce({ en: '/', de: '/' })

    const ctx = createMockRenderContext()
    await new CmsHomepageController(ctx).view()

    const hreflangProp = renderedProps(ctx).hreflangs as {
      callback: () => unknown
    }
    const resolved = hreflangProp.callback() as { href: string }[]

    expect(resolved).toContainEqual({
      rel: 'alternate',
      hreflang: 'en-GB',
      href: 'https://shop.example.com/en',
    })
    expect(resolved).toContainEqual({
      rel: 'alternate',
      hreflang: 'de-DE',
      href: 'https://shop.example.com/de',
    })
    expect(resolved.every((link) => !link.href.endsWith('/homepage'))).toBe(
      true,
    )
  })
})

import { Buffer } from 'node:buffer'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import type { SSRRenderContext } from '@scayle/storefront'
import type {
  Category,
  CategoryListNavigationItem,
  CategoryTreeNavigationNode,
  Filter,
} from '@scayle/storefront/types'
import { buildPagination } from '@scayle/storefront/shared'
import { CategoryNavigationService } from '@scayle/storefront/services'
import { CMSContentNotFoundError } from '@scayle/storefront/cms'
import type { ProductListingPageJsonLd, SEOMeta } from '@shared/types/SEO'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSession,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { createMockCategory } from '../../test/mock-data/categories'
import { createMockListingProduct } from '../../test/mock-data/products'
import * as cmsService from '../cms/providers/scayle/service'
import { ProductListingController } from './product-listing'

// `jose.decodeJwt` only base64url-decodes the payload (no signature check), so a
// hand-built token with a far-future `exp` passes `getValidAccessToken`.
const ACCESS_TOKEN = `header.${Buffer.from(
  JSON.stringify({ exp: 9999999999 }),
).toString('base64url')}.signature`

const mockGetListingPageData = vi.fn()
const mockIsEditorMode = vi.fn(() => false)

const { errorLogMock } = vi.hoisted(() => ({ errorLogMock: vi.fn() }))
vi.mock('@scayle/storefront/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@scayle/storefront/shared')>()),
  createLogger: () => ({
    error: errorLogMock,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@scayle/storefront/services', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@scayle/storefront/services')>()
  return {
    ...original,
    CategoryNavigationService: vi.fn(),
  }
})

let mockFetchCategory: Mock
let mockFetchProductsByQuery: Mock
let mockFetchFiltersByQuery: Mock
let mockFetchCategoryHreflangs: Mock
let mockFetchListNavigation: Mock
let mockFetchTreeNavigation: Mock
let mockFetchImageViewOptions: Mock

/** The category the listing URLs in this file point at. */
function createWomenShoesCategory(overrides: Partial<Category> = {}): Category {
  return createMockCategory({
    id: 42,
    name: 'Women Shoes',
    link: '/c/women-shoes-42',
    ...overrides,
  })
}

function createMockContext(overrides: {
  identifier?: string
  url?: string
  accessToken?: string
}): SSRRenderContext {
  const storefront = createMockStorefrontContext()

  return createMockSSRRenderContext({
    url: overrides.url ?? 'https://example.com/c/women-shoes-42',
    params: { identifier: overrides.identifier ?? 'women-shoes-42' },
    variables: {
      storefront,
      session: createMockSession({ accessToken: overrides.accessToken }),
      mappers: createMockMapperRegistry(storefront),
      services: createMockServiceRegistry({
        productListing: createMockProductListingService(),
        categoryNavigation: createMockCategoryNavigationService(),
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
        attributes: { fetchImageViewOptions: mockFetchImageViewOptions },
        cms: {
          fetchListingPageData: mockGetListingPageData,
          isEditorMode: mockIsEditorMode,
        },
      }),
      inertia: { navigate: vi.fn() },
    },
  })
}

function createMockProductListingService() {
  return {
    fetchCategory: mockFetchCategory,
    fetchProductsByQuery: mockFetchProductsByQuery,
    fetchFiltersByQuery: mockFetchFiltersByQuery,
    fetchCategoryHreflangs: mockFetchCategoryHreflangs,
  }
}

function createMockCategoryNavigationService() {
  return {
    fetchListNavigation: mockFetchListNavigation,
    fetchTreeNavigation: mockFetchTreeNavigation,
  }
}

async function runView(ctx: SSRRenderContext) {
  return new ProductListingController(ctx).view()
}

describe('ProductListingController', () => {
  beforeEach(() => {
    mockFetchCategory = vi.fn()
    mockFetchProductsByQuery = vi.fn()
    mockFetchFiltersByQuery = vi.fn().mockResolvedValue([])
    mockFetchCategoryHreflangs = vi.fn().mockResolvedValue([])
    mockGetListingPageData.mockRejectedValue(
      new CMSContentNotFoundError('CMS content not found'),
    )
    vi.spyOn(cmsService, 'getPageMeta').mockReturnValue(undefined as never)
    mockFetchListNavigation = vi.fn().mockResolvedValue([])
    mockFetchTreeNavigation = vi.fn().mockResolvedValue([])
    mockFetchImageViewOptions = vi.fn().mockResolvedValue([])
    vi.mocked(CategoryNavigationService).mockImplementation(
      createMockCategoryNavigationService,
    )
  })

  describe('render when path matches', () => {
    it('sends the image view options of the attributes service', async () => {
      mockFetchImageViewOptions.mockResolvedValue([
        { value: 'type-a', label: 'Type A' },
      ])
      mockFetchCategory.mockResolvedValue(createWomenShoesCategory())
      const ctx = createMockContext({
        identifier: 'women-shoes-42',
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      const props = vi.mocked(ctx.render).mock.calls[0]![1] as {
        imageViewOptions: () => Promise<unknown>
      }
      await expect(props.imageViewOptions()).resolves.toEqual([
        { value: 'type-a', label: 'Type A' },
      ])
    })

    it('renders ProductListing with the category when the path is the localized category link', async () => {
      const category = createWomenShoesCategory()
      mockFetchCategory.mockResolvedValue(category)
      const ctx = createMockContext({
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      expect(ctx.get('inertia').navigate).not.toHaveBeenCalled()
      expect(ctx.render).toHaveBeenCalledWith(
        'ProductListing',
        expect.objectContaining({ category }),
      )
    })

    it('fetches the hreflangs for the category id', async () => {
      mockFetchCategory.mockResolvedValue(createWomenShoesCategory())
      const ctx = createMockContext({
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      // The hreflang service reads the resolved request origin off its
      // injected request, so the controller only passes the category id.
      const { hreflangs } = vi.mocked(ctx.render).mock.calls[0]![1] as {
        hreflangs: { callback: () => Promise<unknown> }
      }
      await hreflangs.callback()
      expect(mockFetchCategoryHreflangs).toHaveBeenCalledWith(42)
    })

    it('sends products and pagination as eager props, never deferred', async () => {
      mockFetchCategory.mockResolvedValue(createWomenShoesCategory())
      const ctx = createMockContext({
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      // The product grid and JSON-LD must remain in the initial SSR HTML for
      // the one indexable PLP variant. The <Deferred> wrapper on the client is
      // for structural parity only and relies on both props being present at
      // SSR.
      const props = vi.mocked(ctx.render).mock.calls[0]![1] as {
        products: unknown
        pagination: unknown
      }
      expect(typeof props.products).toBe('function')
      expect(props.products).not.toHaveProperty('isDeferred')
      expect(typeof props.pagination).toBe('function')
      expect(props.pagination).not.toHaveProperty('isDeferred')
    })

    it('builds indexable meta with the canonical link of the request URL', async () => {
      mockFetchCategory.mockResolvedValue(createWomenShoesCategory())
      mockFetchProductsByQuery.mockResolvedValue({
        products: [],
        pagination: {},
      })
      const ctx = createMockContext({
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      const { meta } = vi.mocked(ctx.render).mock.calls[0]![1] as {
        meta: () => Promise<SEOMeta>
      }
      await expect(meta()).resolves.toMatchObject({
        canonicalLink: {
          rel: 'canonical',
          key: 'canonical',
          href: 'https://example.com/de/c/women-shoes-42',
        },
        robots: 'index, follow',
      })
    })

    it('fetches the CMS content of the category with the inbound request', async () => {
      const category = createWomenShoesCategory()
      mockFetchCategory.mockResolvedValue(category)
      const ctx = createMockContext({
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      const { cmsContent } = vi.mocked(ctx.render).mock.calls[0]![1] as {
        cmsContent: () => Promise<unknown>
      }
      await cmsContent()
      expect(mockGetListingPageData).toHaveBeenCalledWith(
        category.id,
        ctx.get('request'),
      )
    })

    it('leaves out the description, which names the shop, when the shop name cannot be read', async () => {
      mockFetchCategory.mockResolvedValue(createWomenShoesCategory())
      mockFetchProductsByQuery.mockResolvedValue({
        products: [],
        pagination: {},
      })
      const ctx = createMockContext({
        identifier: 'women-shoes-42',
        url: 'https://example.com/de/c/women-shoes-42',
      })
      vi.mocked(ctx.get('services')!.shopConfig.getShopName).mockResolvedValue(
        undefined,
      )

      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        meta: () => Promise<SEOMeta>
      }
      await expect(renderArg.meta()).resolves.toHaveProperty(
        'description',
        undefined,
      )
    })

    it('includes CMS Open Graph image in meta when listing page CMS data is present', async () => {
      const category = createWomenShoesCategory()
      const cmsPayload = { entry: { sys: { id: 'cms-entry' } } }
      mockFetchCategory.mockResolvedValue(category)
      mockFetchProductsByQuery.mockResolvedValue({
        products: [],
        pagination: {},
      })
      mockGetListingPageData.mockResolvedValue(cmsPayload)
      vi.mocked(cmsService.getPageMeta).mockReturnValue({
        image: 'https://cdn.example.com/plp-og.jpg',
      })
      const ctx = createMockContext({
        identifier: 'women-shoes-42',
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        meta: () => Promise<SEOMeta>
      }
      const meta = await renderArg.meta()

      expect(mockGetListingPageData).toHaveBeenCalled()
      expect(vi.mocked(cmsService.getPageMeta)).toHaveBeenCalledWith(cmsPayload)
      expect(meta.image).toBe('https://cdn.example.com/plp-og.jpg')
    })

    it('renders the listing without CMS content when the CMS provider fails', async () => {
      const category = createWomenShoesCategory()
      mockFetchCategory.mockResolvedValue(category)
      mockFetchProductsByQuery.mockResolvedValue({
        products: [],
        pagination: {},
      })
      mockGetListingPageData.mockRejectedValue(new Error('CMS down'))
      const ctx = createMockContext({
        identifier: 'women-shoes-42',
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        cmsContent: () => Promise<unknown>
        meta: () => Promise<SEOMeta>
      }
      await expect(renderArg.cmsContent()).resolves.toBeUndefined()
      await expect(renderArg.meta()).resolves.toEqual(
        expect.objectContaining({ image: undefined }),
      )
    })

    it('logs a CMS provider failure once with the category id', async () => {
      mockFetchCategory.mockResolvedValue(createWomenShoesCategory({ id: 42 }))
      mockFetchProductsByQuery.mockResolvedValue({
        products: [],
        pagination: {},
      })
      const cmsError = new Error('CMS down')
      mockGetListingPageData.mockRejectedValue(cmsError)
      const ctx = createMockContext({
        identifier: 'women-shoes-42',
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)
      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        cmsContent: () => Promise<unknown>
        meta: () => Promise<SEOMeta>
      }
      await renderArg.cmsContent()
      await renderArg.meta()

      expect(errorLogMock).toHaveBeenCalledExactlyOnceWith({
        message: 'Unexpected CMS error on PLP',
        err: cmsError,
        categoryId: 42,
      })
    })
  })

  describe('head meta', () => {
    async function renderMeta(overrides: {
      url?: string
      category?: Category
    }): Promise<SEOMeta> {
      mockFetchCategory.mockResolvedValue(
        overrides.category ?? createWomenShoesCategory(),
      )
      mockFetchProductsByQuery.mockResolvedValue({
        products: [],
        pagination: {},
      })
      const ctx = createMockContext({
        url: overrides.url ?? 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      const renderArg = vi.mocked(ctx.render).mock.calls[0]![1] as {
        meta: () => Promise<SEOMeta>
      }
      return renderArg.meta()
    }

    it.for<{ variant: string; url: string }>([
      {
        variant: 'a page beyond the first',
        url: 'https://example.com/de/c/women-shoes-42?page=2',
      },
      {
        variant: 'a sort other than the default',
        url: 'https://example.com/de/c/women-shoes-42?sort=price_asc',
      },
      {
        variant: 'applied filters',
        url: 'https://example.com/de/c/women-shoes-42?filters[color]=1',
      },
    ])(
      'marks $variant noindex, follow without a canonical link',
      async ({ url }) => {
        const meta = await renderMeta({ url })

        expect(meta.robots).toBe('noindex, follow')
        expect(meta.canonicalLink).toBeUndefined()
      },
    )

    it('strips query parameters that are not allow-listed from the canonical link', async () => {
      const meta = await renderMeta({
        url: 'https://example.com/de/c/women-shoes-42?utm_source=foo',
      })

      expect(meta.canonicalLink?.href).toBe(
        'https://example.com/de/c/women-shoes-42',
      )
    })

    it('builds the title from the category trail and the shop name', async () => {
      const meta = await renderMeta({
        category: createWomenShoesCategory({
          breadcrumbs: [{ id: 1, to: '/c/women-1', value: 'Women' }],
        }),
      })

      expect(meta.title).toBe('Women Shoes - Women | Test Shop')
    })

    it('appends the page number to the title beyond the first page', async () => {
      const meta = await renderMeta({
        url: 'https://example.com/de/c/women-shoes-42?page=2',
      })

      expect(meta.title).toBe('Women Shoes - Page 2 | Test Shop')
    })

    it('builds the description from the category name and the shop name', async () => {
      const meta = await renderMeta({})

      expect(meta.description).toBe(
        'Buy Women Shoes at Test Shop. Discover a wide range of Women Shoes',
      )
    })
  })

  describe('JSON-LD', () => {
    async function renderJsonLd(overrides: { url?: string }) {
      mockFetchCategory.mockResolvedValue(createWomenShoesCategory())
      mockFetchProductsByQuery.mockResolvedValue({
        products: [createMockListingProduct({ id: 100 })],
        pagination: {},
      })
      const ctx = createMockContext({
        url: overrides.url ?? 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      return vi.mocked(ctx.render).mock.calls[0]![1] as unknown as {
        jsonLd: {
          isServerOnly: boolean
          callback: () => Promise<ProductListingPageJsonLd>
        }
      }
    }

    it('sends the ItemList of the page products and the BreadcrumbList as a server-only prop', async () => {
      const { jsonLd } = await renderJsonLd({})

      expect(jsonLd.isServerOnly).toBe(true)
      await expect(jsonLd.callback()).resolves.toMatchObject([
        {
          '@type': 'ItemList',
          name: 'Women Shoes',
          itemListElement: [{ position: 1, item: { sku: '100' } }],
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              name: 'Women Shoes',
              item: 'https://example.com/de/c/women-shoes-42',
            },
          ],
        },
      ])
    })

    it('names the ItemList after the listing title with the page suffix beyond the first page', async () => {
      const { jsonLd } = await renderJsonLd({
        url: 'https://example.com/de/c/women-shoes-42?page=2',
      })

      const [itemList] = await jsonLd.callback()
      expect(itemList.name).toBe('Women Shoes - Page 2')
    })
  })

  describe('listing props', () => {
    const pagination = buildPagination({
      totalItems: 40,
      itemsPerPage: 32,
      currentPage: 1,
      totalPageCount: 2,
      visiblePageCount: 6,
    })

    async function renderListing(accessToken?: string) {
      mockFetchCategory.mockResolvedValue(createWomenShoesCategory())
      const ctx = createMockContext({
        identifier: 'women-shoes-42',
        url: 'https://example.com/de/c/women-shoes-42',
        accessToken,
      })

      await runView(ctx)

      return vi.mocked(ctx.render).mock.calls[0]![1] as {
        filters: { callback: () => Promise<unknown> }
        products: () => Promise<unknown>
        pagination: () => Promise<unknown>
        listNavigationCategories: () => Promise<unknown>
        treeNavigationCategories: () => Promise<unknown>
      }
    }

    it('resolves filters to the filters fetched for the category', async () => {
      const filters: Filter[] = [
        {
          type: 'boolean',
          slug: 'sale',
          name: 'Sale',
          trueCount: 3,
          falseCount: 7,
        },
      ]
      mockFetchFiltersByQuery.mockResolvedValue(filters)
      const renderArg = await renderListing()

      const result = await renderArg.filters.callback()

      expect(mockFetchFiltersByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 42 }),
        }),
      )
      expect(result).toEqual(filters)
    })

    it('resolves products to the products of the fetched listing page', async () => {
      const products = [createMockListingProduct({ id: 7 })]
      mockFetchProductsByQuery.mockResolvedValue({ products, pagination })
      const renderArg = await renderListing()

      await expect(renderArg.products()).resolves.toEqual(products)
    })

    it('resolves pagination to the pagination of the fetched listing page', async () => {
      mockFetchProductsByQuery.mockResolvedValue({ products: [], pagination })
      const renderArg = await renderListing()

      await expect(renderArg.pagination()).resolves.toEqual(pagination)
    })

    it('fetches the list navigation for the category without empty categories', async () => {
      const listNavigation: CategoryListNavigationItem[] = [
        { name: 'Sneakers', path: '/c/sneakers-43', isActive: false },
      ]
      mockFetchListNavigation.mockResolvedValue(listNavigation)
      const renderArg = await renderListing()

      const result = await renderArg.listNavigationCategories()

      expect(mockFetchListNavigation).toHaveBeenCalledWith(42, {
        showEmptyCategories: false,
      })
      expect(result).toEqual(listNavigation)
    })

    it('fetches the tree navigation for the category without empty categories', async () => {
      const treeNavigation: CategoryTreeNavigationNode[] = [
        {
          name: 'Women Shoes',
          path: '/c/women-shoes-42',
          isActive: true,
          depth: 1,
          children: [],
        },
      ]
      mockFetchTreeNavigation.mockResolvedValue(treeNavigation)
      const renderArg = await renderListing()

      const result = await renderArg.treeNavigationCategories()

      expect(mockFetchTreeNavigation).toHaveBeenCalledWith(42, {
        showEmptyCategories: false,
      })
      expect(result).toEqual(treeNavigation)
    })

    it('fetches the navigations with the access token of a logged-in customer', async () => {
      const renderArg = await renderListing(ACCESS_TOKEN)

      await renderArg.listNavigationCategories()
      await renderArg.treeNavigationCategories()

      expect(mockFetchListNavigation).toHaveBeenCalledWith(42, {
        showEmptyCategories: false,
        customerToken: ACCESS_TOKEN,
      })
      expect(mockFetchTreeNavigation).toHaveBeenCalledWith(42, {
        showEmptyCategories: false,
        customerToken: ACCESS_TOKEN,
      })
    })
  })

  describe('partial reloads', () => {
    it('does not fetch CMS content until a consuming prop is evaluated', async () => {
      const category = createWomenShoesCategory()
      mockFetchCategory.mockResolvedValue(category)
      mockFetchProductsByQuery.mockResolvedValue({
        products: [],
        pagination: {},
      })
      const ctx = createMockContext({
        identifier: 'women-shoes-42',
        url: 'https://example.com/de/c/women-shoes-42',
      })

      await runView(ctx)

      // getViewProps returns prop values as thunks; runView never invokes
      // them (ctx.render is a mock), so this proves the lazyPromise accessor's
      // factory doesn't run just because getViewProps ran — only once a prop
      // calls it.
      expect(mockGetListingPageData).not.toHaveBeenCalled()
    })
  })
})

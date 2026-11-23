import { describe, it, expect, vi } from 'vitest'
import { Inertia } from '@scayle/storefront'
import type { SSRRenderContext } from '@scayle/storefront'
import {
  createMockMapperRegistry,
  createMockServiceRegistry,
  createMockSSRRenderContext,
  createMockStorefrontContext,
} from '../../test/utils/context'
import { createMockListingProduct } from '../../test/mock-data/products'
import { SearchController } from './search'

const {
  resolveMock,
  fetchProductsByQueryMock,
  fetchFiltersByQueryMock,
  fetchImageViewOptionsMock,
} = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  fetchProductsByQueryMock: vi.fn(),
  fetchFiltersByQueryMock: vi.fn(),
  fetchImageViewOptionsMock: vi.fn(),
}))

const { errorLogMock } = vi.hoisted(() => ({ errorLogMock: vi.fn() }))
// The logger is created at module load, before the per-test mock clearing, so the
// namespace is passed through to `errorLogMock` to stay assertable per test.
vi.mock('@scayle/storefront/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@scayle/storefront/shared')>()),
  createLogger: (namespace: string) => ({
    error: (...args: unknown[]) => errorLogMock(namespace, ...args),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@scayle/storefront', async (importOriginal) => {
  const original = await importOriginal<typeof import('@scayle/storefront')>()
  return {
    ...original,
    // Pass deferred and server-only callbacks through unchanged so the test
    // can invoke them.
    Inertia: {
      defer: vi.fn((fn: unknown) => fn),
      serverOnly: vi.fn((fn: unknown) => fn),
    },
  }
})

function createMockContext(
  overrides: { query?: Record<string, string>; isMainRequest?: boolean } = {},
): SSRRenderContext {
  const storefront = createMockStorefrontContext()
  const queryString = new URLSearchParams(overrides.query ?? {}).toString()

  return createMockSSRRenderContext({
    url: queryString
      ? `https://example.com/search?${queryString}`
      : 'https://example.com/search',
    variables: {
      storefront,
      mappers: createMockMapperRegistry(storefront),
      services: createMockServiceRegistry({
        search: { resolve: resolveMock },
        productListing: {
          fetchProductsByQuery: fetchProductsByQueryMock,
          fetchFiltersByQuery: fetchFiltersByQueryMock,
        },
        attributes: { fetchImageViewOptions: fetchImageViewOptionsMock },
        shopConfig: { getShopName: vi.fn().mockResolvedValue('Test Shop') },
      }),
      inertia: {
        isMainRequest: () => overrides.isMainRequest ?? true,
        navigate: vi.fn(
          (location: string, status?: number) =>
            new Response(null, { status, headers: { Location: location } }),
        ),
      },
    },
  })
}

describe('SearchController', () => {
  it('redirects when a first-page, unfiltered term resolves to a target', async () => {
    resolveMock.mockResolvedValue({ type: 'category', link: '/c/shoes-1' })
    const ctx = createMockContext({ query: { 'filters[term]': 'shoes' } })

    await new SearchController(ctx).view()

    expect(resolveMock).toHaveBeenCalledWith('shoes')
    expect(ctx.get('inertia').navigate).toHaveBeenCalledWith('/c/shoes-1', 302)
    expect(ctx.render).not.toHaveBeenCalled()
  })

  it('renders Search without a redirect and logs the error when the resolve fails', async () => {
    const error = new Error('resolve unavailable')
    resolveMock.mockRejectedValue(error)
    const ctx = createMockContext({ query: { 'filters[term]': 'shoes' } })

    await new SearchController(ctx).view()

    expect(ctx.get('inertia').navigate).not.toHaveBeenCalled()
    expect(ctx.render).toHaveBeenCalledWith('Search', expect.anything())
    expect(errorLogMock).toHaveBeenCalledExactlyOnceWith('search', {
      message: 'Failed to resolve search term',
      err: error,
    })
  })

  it('renders Search with products and deferred filters when the term does not resolve', async () => {
    resolveMock.mockResolvedValue(null)
    const listing = { products: [{ id: 1 }], pagination: {} }
    fetchProductsByQueryMock.mockResolvedValue(listing)
    fetchFiltersByQueryMock.mockResolvedValue([{ slug: 'color' }])
    const ctx = createMockContext({ query: { 'filters[term]': 'shoes' } })

    await new SearchController(ctx).view()

    expect(ctx.get('inertia').navigate).not.toHaveBeenCalled()
    const [template, props] = (ctx.render as ReturnType<typeof vi.fn>).mock
      .calls[0]!
    expect(template).toBe('Search')
    expect(props.term).toBe('shoes')
    await expect(props.products()).resolves.toBe(listing.products)
    await expect(props.pagination()).resolves.toBe(listing.pagination)
    await expect(props.filters()).resolves.toEqual([{ slug: 'color' }])
    // Guards the partial-reload boundary: filters must stay wrapped in
    // Inertia.defer with its `filters` group, not degrade to a bare thunk;
    // products is deliberately an eager server prop (no defer).
    expect(Inertia.defer).toHaveBeenCalledTimes(1)
    expect(Inertia.defer).toHaveBeenCalledWith(expect.any(Function), {
      group: 'filters',
    })
    expect(fetchProductsByQueryMock).toHaveBeenCalledWith({
      where: { term: 'shoes' },
      pagination: { page: 1, perPage: 32 },
      includeSoldOut: false,
      includeSellableForFree: false,
      trackSearchAnalyticsEvent: true,
    })
  })

  it.for([
    {
      condition: 'a term the Storefront API accepts',
      term: 'shoes',
      expected: false,
    },
    { condition: 'a term over 60 bytes', term: 'a'.repeat(61), expected: true },
  ])(
    'sends termRejected as $expected for $condition',
    async ({ term, expected }) => {
      resolveMock.mockResolvedValue(null)
      const ctx = createMockContext({ query: { 'filters[term]': term } })

      await new SearchController(ctx).view()

      expect(ctx.render).toHaveBeenCalledWith(
        'Search',
        expect.objectContaining({ termRejected: expected }),
      )
    },
  )

  it('sends filters as an eager empty list for a rejected term', async () => {
    resolveMock.mockResolvedValue(null)
    const ctx = createMockContext({
      query: { 'filters[term]': 'a'.repeat(61) },
    })

    await new SearchController(ctx).view()

    expect(ctx.render).toHaveBeenCalledWith(
      'Search',
      expect.objectContaining({ filters: [] }),
    )
    expect(Inertia.defer).not.toHaveBeenCalled()
  })

  it('sends the image view options of the attributes service', async () => {
    resolveMock.mockResolvedValue(null)
    fetchImageViewOptionsMock.mockResolvedValue([
      { value: 'type-a', label: 'Type A' },
    ])
    const ctx = createMockContext({ query: { 'filters[term]': 'shoes' } })

    await new SearchController(ctx).view()

    const [, props] = (ctx.render as ReturnType<typeof vi.fn>).mock.calls[0]!
    await expect(props.imageViewOptions()).resolves.toEqual([
      { value: 'type-a', label: 'Type A' },
    ])
  })

  it('propagates a search failure through the products prop', async () => {
    resolveMock.mockResolvedValue(null)
    fetchProductsByQueryMock.mockRejectedValue(new Error('SAPI unavailable'))
    fetchFiltersByQueryMock.mockResolvedValue([])
    const ctx = createMockContext({ query: { 'filters[term]': 'shoes' } })

    await new SearchController(ctx).view()

    const props = (ctx.render as ReturnType<typeof vi.fn>).mock.calls[0]![1]
    // The fetch is not swallowed: a SAPI failure rejects the shared products
    // promise rather than degrading to an empty listing.
    await expect(props.products()).rejects.toThrow('SAPI unavailable')
  })

  it('fetches products lazily, only once, and not before a prop is evaluated', async () => {
    resolveMock.mockResolvedValue(null)
    fetchProductsByQueryMock.mockResolvedValue({ products: [], pagination: {} })
    fetchFiltersByQueryMock.mockResolvedValue([])
    const ctx = createMockContext({ query: { 'filters[term]': 'shoes' } })

    await new SearchController(ctx).view()

    const props = (ctx.render as ReturnType<typeof vi.fn>).mock.calls[0]![1]
    // Building the props must not trigger the fetch on its own.
    expect(fetchProductsByQueryMock).not.toHaveBeenCalled()

    // Evaluating `products` and `jsonLd` (which share the promise) fetches once.
    await props.products()
    await props.jsonLd()
    expect(fetchProductsByQueryMock).toHaveBeenCalledTimes(1)
  })

  it('builds a noindex, nofollow meta titled with the term and the shop name, without a canonical link', async () => {
    resolveMock.mockResolvedValue(null)
    const ctx = createMockContext({ query: { 'filters[term]': 'shoes' } })

    await new SearchController(ctx).view()

    const [, props] = (ctx.render as ReturnType<typeof vi.fn>).mock.calls[0]!
    await expect(props.meta()).resolves.toStrictEqual({
      title: 'Products for "shoes" | Test Shop',
      robots: 'noindex, nofollow',
    })
  })

  it('appends the page number to the meta title beyond the first page', async () => {
    const ctx = createMockContext({
      query: { 'filters[term]': 'shoes', page: '2' },
    })

    await new SearchController(ctx).view()

    const [, props] = (ctx.render as ReturnType<typeof vi.fn>).mock.calls[0]!
    await expect(props.meta()).resolves.toHaveProperty(
      'title',
      'Products for "shoes" - Page 2 | Test Shop',
    )
  })

  it('sends the ItemList of the result products as a server-only JSON-LD prop named after the title', async () => {
    resolveMock.mockResolvedValue(null)
    fetchProductsByQueryMock.mockResolvedValue({
      products: [createMockListingProduct({ id: 100, link: '/p/shoe-100' })],
      pagination: {},
    })
    const ctx = createMockContext({ query: { 'filters[term]': 'shoes' } })

    await new SearchController(ctx).view()

    const [, props] = (ctx.render as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(Inertia.serverOnly).toHaveBeenCalledExactlyOnceWith(props.jsonLd)
    await expect(props.jsonLd()).resolves.toMatchObject({
      '@type': 'ItemList',
      name: 'Products for "shoes"',
      itemListElement: [
        {
          position: 1,
          item: { sku: '100', url: 'https://example.com/de/p/shoe-100' },
        },
      ],
    })
  })

  it.for<{
    condition: string
    query: Record<string, string>
    isMainRequest: boolean
  }>([
    {
      condition: 'filters are applied',
      query: { 'filters[term]': 'shoes', 'filters[color]': '1,2' },
      isMainRequest: true,
    },
    {
      condition: 'beyond the first page',
      query: { 'filters[term]': 'shoes', page: '2' },
      isMainRequest: true,
    },
    {
      condition: 'on an Inertia partial reload',
      query: { 'filters[term]': 'shoes' },
      isMainRequest: false,
    },
  ])(
    'renders Search without attempting a resolve redirect $condition',
    async ({ query, isMainRequest }) => {
      fetchProductsByQueryMock.mockResolvedValue({
        products: [],
        pagination: {},
      })
      fetchFiltersByQueryMock.mockResolvedValue([])
      const ctx = createMockContext({ query, isMainRequest })

      await new SearchController(ctx).view()

      expect(resolveMock).not.toHaveBeenCalled()
      expect(ctx.render).toHaveBeenCalledWith('Search', expect.anything())
    },
  )
})

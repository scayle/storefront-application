import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'
import { MAX_RECENTLY_VIEWED_PRODUCTS } from '@client/constants'
import { createMockListingProduct } from '../../test/mock-data/products'

const {
  mockUseLocalStorage,
  mockRpcClient,
  mockGetProductsByIds,
  mockUseStorefrontConfig,
} = vi.hoisted(() => {
  return {
    mockUseLocalStorage: vi.fn(),
    mockGetProductsByIds: vi.fn(),
    mockRpcClient: {
      cms: {
        getProductsByIds: vi.fn(),
      },
    },
    mockUseStorefrontConfig: vi.fn(() => ({
      country: computed(() => ({ shopCountryId: 'test-shop' })),
      config: computed(() => ({
        config: {
          publicFields: {},
        },
      })),
    })),
  }
})

vi.mock('@vueuse/core', () => ({
  useLocalStorage: mockUseLocalStorage,
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: vi.fn(() => ({
    props: {
      storefront: {
        country: { shopCountryId: 'test-shop' },
        config: {
          publicFields: {},
        },
      },
    },
  })),
}))

vi.mock('./useStorefrontConfig', () => ({
  useStorefrontConfig: mockUseStorefrontConfig,
}))

vi.mock('./useRpcClient', () => ({
  useRpcClient: () => mockRpcClient,
}))

describe('useRecentlyViewedProducts', () => {
  const mockLocalStorage: Ref<number[]> = ref([])

  // Helper to dynamically import the composable for each test
  async function loadComposable() {
    const { useRecentlyViewedProducts } =
      await import('./useRecentlyViewedProducts')
    return useRecentlyViewedProducts
  }

  beforeEach(async () => {
    vi.stubEnv('SSR', false)
    // Clear module cache to reset module-level loadingPromise Map
    vi.resetModules()

    mockLocalStorage.value = []
    mockGetProductsByIds.mockImplementation(({ ids }: { ids: number[] }) => {
      return Promise.resolve(
        createSafeSuccess(
          ids.map((id: number) => createMockListingProduct({ id })),
        ),
      )
    })
    mockRpcClient.cms.getProductsByIds = mockGetProductsByIds

    mockUseLocalStorage.mockReturnValue(mockLocalStorage)
  })

  /** Ascending ids 1..count, mirroring the order products are added in. */
  const idsUpTo = (count: number) =>
    Array.from({ length: count }, (_, index) => index + 1)

  it('keeps the newest id and drops the oldest beyond the cap', async () => {
    mockLocalStorage.value = idsUpTo(MAX_RECENTLY_VIEWED_PRODUCTS)
    const useRecentlyViewedProducts = await loadComposable()
    const { addProductId } = useRecentlyViewedProducts()

    addProductId(MAX_RECENTLY_VIEWED_PRODUCTS + 1)

    expect(mockLocalStorage.value).toEqual([
      MAX_RECENTLY_VIEWED_PRODUCTS + 1,
      ...idsUpTo(MAX_RECENTLY_VIEWED_PRODUCTS - 1),
    ])
    expect(mockLocalStorage.value).toHaveLength(MAX_RECENTLY_VIEWED_PRODUCTS)
  })

  it('fetches every stored product id on the first load', async () => {
    mockLocalStorage.value = [123, 456]

    const useRecentlyViewedProducts = await loadComposable()
    const { loadMissingProducts, products } = useRecentlyViewedProducts()

    await loadMissingProducts()

    expect(mockGetProductsByIds).toHaveBeenCalledWith({
      ids: [123, 456],
      pricePromotionKey: undefined,
    })
    expect(products.value.map((product) => product.id)).toEqual([123, 456])
  })

  it('fetches only the newly added id and puts its product first', async () => {
    mockLocalStorage.value = [123, 456]

    const useRecentlyViewedProducts = await loadComposable()
    const { loadMissingProducts, products, addProductId } =
      useRecentlyViewedProducts()

    await loadMissingProducts()

    addProductId(789)
    await loadMissingProducts()

    expect(mockGetProductsByIds).toHaveBeenLastCalledWith({
      ids: [789],
      pricePromotionKey: undefined,
    })
    expect(products.value.map((product) => product.id)).toEqual([789, 123, 456])
  })

  it('moves an already loaded product to the front without fetching it again', async () => {
    mockLocalStorage.value = [123, 456]

    const useRecentlyViewedProducts = await loadComposable()
    const { loadMissingProducts, products, addProductId } =
      useRecentlyViewedProducts()

    await loadMissingProducts()
    addProductId(789)
    await loadMissingProducts()

    addProductId(123)
    await loadMissingProducts()

    expect(mockGetProductsByIds).toHaveBeenCalledTimes(2)
    expect(products.value.map((product) => product.id)).toEqual([123, 789, 456])
  })

  it('should not fetch if all products are already loaded', async () => {
    mockLocalStorage.value = [123, 456]

    const useRecentlyViewedProducts = await loadComposable()
    const { loadMissingProducts, products } = useRecentlyViewedProducts()

    await loadMissingProducts()
    await loadMissingProducts()

    expect(mockGetProductsByIds).toHaveBeenCalledTimes(1)

    expect(products.value.map((p) => p.id)).toEqual([123, 456])
  })

  it('should handle empty localStorage', async () => {
    const useRecentlyViewedProducts = await loadComposable()
    const { loadMissingProducts, products, error, status } =
      useRecentlyViewedProducts()

    await loadMissingProducts()

    expect(mockGetProductsByIds).not.toHaveBeenCalled()
    expect(products.value).toEqual([])
    expect(error.value).toBeUndefined()
    expect(status.value).toBe('success')
  })

  it('should set loading and status states correctly', async () => {
    const useRecentlyViewedProducts = await loadComposable()
    const { loadMissingProducts, loading, status, addProductId } =
      useRecentlyViewedProducts()

    addProductId(123)
    const fetchPromise = loadMissingProducts()

    expect(loading.value).toBe(true)
    expect(status.value).toBe('pending')

    await fetchPromise

    expect(loading.value).toBe(false)
    expect(status.value).toBe('success')
  })

  it('should handle errors correctly', async () => {
    const testError = new Error('Fetch failed')
    mockGetProductsByIds.mockResolvedValue(createSafeFailure(testError))

    const useRecentlyViewedProducts = await loadComposable()
    const { loadMissingProducts, error, status, loading, addProductId } =
      useRecentlyViewedProducts()

    addProductId(123)
    await loadMissingProducts()

    expect(error.value).toBe(testError)
    expect(status.value).toBe('error')
    expect(loading.value).toBe(false)
  })

  it('loads only the newest products after the stored list overflows', async () => {
    const useRecentlyViewedProducts = await loadComposable()
    const { addProductId, loadMissingProducts, products } =
      useRecentlyViewedProducts()

    for (let id = 1; id <= MAX_RECENTLY_VIEWED_PRODUCTS; id++) {
      addProductId(id)
    }
    await loadMissingProducts()
    addProductId(MAX_RECENTLY_VIEWED_PRODUCTS + 1)

    await loadMissingProducts()

    expect(products.value.map((product) => product.id)).toEqual(
      Array.from(
        { length: MAX_RECENTLY_VIEWED_PRODUCTS },
        (_, index) => MAX_RECENTLY_VIEWED_PRODUCTS + 1 - index,
      ),
    )
  })

  it('should pass pricePromotionKey to the RPC call when provided', async () => {
    mockLocalStorage.value = [123]

    const useRecentlyViewedProducts = await loadComposable()
    const { loadMissingProducts, addProductId } = useRecentlyViewedProducts({
      pricePromotionKey: 'summer-sale',
    })

    addProductId(123)
    await loadMissingProducts()

    expect(mockGetProductsByIds).toHaveBeenCalledWith({
      ids: [123],
      pricePromotionKey: 'summer-sale',
    })
  })

  it('should only call RPC once when loading the same missing product concurrently', async () => {
    mockLocalStorage.value = [123]

    const useRecentlyViewedProducts = await loadComposable()
    const { loadMissingProducts, products } = useRecentlyViewedProducts()

    // Fire two concurrent requests for the same missing product
    const promise1 = loadMissingProducts()
    const promise2 = loadMissingProducts()

    await Promise.all([promise1, promise2])

    // Should only make one RPC call
    expect(mockGetProductsByIds).toHaveBeenCalledTimes(1)
    expect(mockGetProductsByIds).toHaveBeenCalledWith({
      ids: [123],
      pricePromotionKey: undefined,
    })

    // Both callers should get the same product
    expect(products.value.map((p) => p.id)).toEqual([123])
  })

  describe('on the server', () => {
    it('throws when addProductId runs on the server', async () => {
      vi.stubEnv('SSR', true)
      const useRecentlyViewedProducts = await loadComposable()
      const { addProductId } = useRecentlyViewedProducts()

      expect(() => addProductId(1)).toThrow(
        'addProductId is therefore not available on the server.',
      )
    })

    it('rejects when loadMissingProducts runs on the server', async () => {
      vi.stubEnv('SSR', true)
      const useRecentlyViewedProducts = await loadComposable()
      const { loadMissingProducts } = useRecentlyViewedProducts()

      await expect(loadMissingProducts()).rejects.toThrow(
        'fetchProducts is therefore not available on the server.',
      )
    })
  })
})

import { flushPromises } from '@vue/test-utils'
import { effectScope, ref } from 'vue'
import type { Ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { SmartSortingKey } from '@scayle/storefront-api'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'
import { useCmsSmartSortingProducts } from './useCmsSmartSortingProducts'
import type { CmsSmartSortingQuery } from './useCmsSmartSortingProducts'

const mockGetProductsBySmartSorting = vi.fn()

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    cms: { getProductsBySmartSorting: mockGetProductsBySmartSorting },
  }),
}))

const setup = (query: Ref<CmsSmartSortingQuery>) => {
  let api!: ReturnType<typeof useCmsSmartSortingProducts>
  effectScope().run(() => {
    api = useCmsSmartSortingProducts(query)
  })
  return api
}

describe('useCmsSmartSortingProducts', () => {
  it('fetches the products for the query', async () => {
    mockGetProductsBySmartSorting.mockResolvedValueOnce(
      createSafeSuccess([{ id: 1 }]),
    )
    const api = setup(
      ref({
        smartSortingKey: SmartSortingKey.TOPSELLER,
        brandId: 5,
        categoryId: 7,
        limit: 4,
      }),
    )

    await api.fetchProducts()

    expect(mockGetProductsBySmartSorting).toHaveBeenCalledWith({
      smartSortingKey: SmartSortingKey.TOPSELLER,
      brandId: 5,
      categoryId: 7,
      limit: 4,
    })
    expect(api.products.value).toEqual([{ id: 1 }])
  })

  it('returns no products without a smart sorting key and skips the fetch', async () => {
    const api = setup(ref({ limit: 4 }))

    await api.fetchProducts()

    expect(mockGetProductsBySmartSorting).not.toHaveBeenCalled()
    expect(api.products.value).toEqual([])
  })

  it('refetches when the query changes', async () => {
    mockGetProductsBySmartSorting.mockResolvedValue(createSafeSuccess([]))
    const query = ref<CmsSmartSortingQuery>({
      smartSortingKey: SmartSortingKey.TOPSELLER,
    })
    const api = setup(query)
    await api.fetchProducts()

    query.value = { smartSortingKey: SmartSortingKey.NEW_ARRIVALS }
    await flushPromises()

    expect(mockGetProductsBySmartSorting).toHaveBeenLastCalledWith(
      expect.objectContaining({
        smartSortingKey: SmartSortingKey.NEW_ARRIVALS,
      }),
    )
  })

  it('returns no products when the fetch fails', async () => {
    mockGetProductsBySmartSorting.mockResolvedValueOnce(
      createSafeSuccess([{ id: 1 }]),
    )
    const api = setup(ref({ smartSortingKey: SmartSortingKey.TOPSELLER }))
    await api.fetchProducts()

    mockGetProductsBySmartSorting.mockResolvedValueOnce(
      createSafeFailure(new Error('rpc down')),
    )
    await api.fetchProducts()

    expect(api.products.value).toEqual([])
  })
})

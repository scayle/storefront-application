import { flushPromises } from '@vue/test-utils'
import { effectScope, ref } from 'vue'
import type { Ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'
import { useCmsProductSlider } from './useCmsProductSlider'

const mockGetProductsByIds = vi.fn()

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    cms: { getProductsByIds: mockGetProductsByIds },
  }),
}))

const setup = (productIds: Ref<number[]>) => {
  let api!: ReturnType<typeof useCmsProductSlider>
  effectScope().run(() => {
    api = useCmsProductSlider(productIds)
  })
  return api
}

const ids = (products: { id: number }[]) => products.map(({ id }) => id)

describe('useCmsProductSlider', () => {
  it('fetches the configured ids', async () => {
    mockGetProductsByIds.mockResolvedValueOnce(createSafeSuccess([]))
    const api = setup(ref([101, 102]))

    await api.fetchProducts()

    expect(mockGetProductsByIds).toHaveBeenCalledWith({ ids: [101, 102] })
  })

  it('restores the author order when the API returns matches out of order', async () => {
    mockGetProductsByIds.mockResolvedValueOnce(
      createSafeSuccess([{ id: 102 }, { id: 101 }]),
    )
    const api = setup(ref([101, 102]))

    await api.fetchProducts()

    expect(ids(api.products.value)).toEqual([101, 102])
  })

  it('sorts a product the list does not name to the end', async () => {
    mockGetProductsByIds.mockResolvedValueOnce(
      createSafeSuccess([{ id: 999 }, { id: 101 }]),
    )
    const api = setup(ref([101, 102]))

    await api.fetchProducts()

    expect(ids(api.products.value)).toEqual([101, 999])
  })

  it('returns no products for an empty list without fetching', async () => {
    const api = setup(ref([]))

    await api.fetchProducts()

    expect(mockGetProductsByIds).not.toHaveBeenCalled()
    expect(api.products.value).toEqual([])
  })

  it('re-sorts without refetching when the ids only change order', async () => {
    mockGetProductsByIds.mockResolvedValue(
      createSafeSuccess([{ id: 101 }, { id: 102 }]),
    )
    const productIds = ref([101, 102])
    const api = setup(productIds)
    await api.fetchProducts()

    productIds.value = [102, 101]
    await flushPromises()

    expect(mockGetProductsByIds).toHaveBeenCalledTimes(1)
    expect(ids(api.products.value)).toEqual([102, 101])
  })

  it('refetches when the set of ids changes', async () => {
    mockGetProductsByIds.mockResolvedValueOnce(createSafeSuccess([{ id: 101 }]))
    const productIds = ref([101])
    const api = setup(productIds)
    await api.fetchProducts()

    mockGetProductsByIds.mockResolvedValueOnce(createSafeSuccess([{ id: 202 }]))
    productIds.value = [202]
    await flushPromises()

    expect(mockGetProductsByIds).toHaveBeenLastCalledWith({ ids: [202] })
    expect(ids(api.products.value)).toEqual([202])
  })

  it('returns no products when the fetch fails', async () => {
    mockGetProductsByIds.mockResolvedValueOnce(createSafeSuccess([{ id: 101 }]))
    const api = setup(ref([101]))
    await api.fetchProducts()

    mockGetProductsByIds.mockResolvedValueOnce(
      createSafeFailure(new Error('rpc down')),
    )
    await api.fetchProducts()

    expect(api.products.value).toEqual([])
  })
})

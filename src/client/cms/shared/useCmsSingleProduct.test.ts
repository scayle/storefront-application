import { flushPromises } from '@vue/test-utils'
import { effectScope, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'
import { useCmsSingleProduct } from './useCmsSingleProduct'

const mockGetProductsByIds = vi.fn()

vi.mock('@client/composables/useRpcClient', () => ({
  useRpcClient: () => ({
    cms: { getProductsByIds: mockGetProductsByIds },
  }),
}))

const mountComposable = (
  productId: ReturnType<typeof ref<number | undefined>>,
) => {
  let api!: ReturnType<typeof useCmsSingleProduct>
  const scope = effectScope()
  scope.run(() => {
    api = useCmsSingleProduct(productId)
  })
  return { api, cleanup: () => scope.stop() }
}

describe('useCmsSingleProduct', () => {
  it('resolves the configured product', async () => {
    mockGetProductsByIds.mockResolvedValueOnce(createSafeSuccess([{ id: 101 }]))
    const { api } = mountComposable(ref(101))
    await api.fetchProduct()
    expect(mockGetProductsByIds).toHaveBeenCalledWith({ ids: [101] })
    expect(api.product.value).toMatchObject({ id: 101 })
  })

  it('clears the product for a falsy id without fetching', async () => {
    mockGetProductsByIds.mockClear()
    const { api } = mountComposable(ref(0))

    await api.fetchProduct()

    expect(mockGetProductsByIds).not.toHaveBeenCalled()
    expect(api.product.value).toBeUndefined()
  })

  it('clears the product without throwing when the fetch fails', async () => {
    mockGetProductsByIds.mockResolvedValueOnce(createSafeSuccess([{ id: 101 }]))
    const { api } = mountComposable(ref(101))
    await api.fetchProduct()
    expect(api.product.value).toMatchObject({ id: 101 })

    mockGetProductsByIds.mockResolvedValueOnce(
      createSafeFailure(new Error('rpc down')),
    )

    await expect(api.fetchProduct()).resolves.toBeUndefined()
    expect(api.product.value).toBeUndefined()
  })

  it('leaves the product undefined when the id resolves to no product', async () => {
    mockGetProductsByIds.mockResolvedValueOnce(createSafeSuccess([]))
    const { api } = mountComposable(ref(999))

    await api.fetchProduct()

    expect(api.product.value).toBeUndefined()
  })

  it('drops a stale response so a slow earlier fetch cannot overwrite a newer one', async () => {
    // Resolvers we trigger manually to force out-of-order completion. The two
    // fetches are driven by the internal `watch`, matching production usage.
    let resolveFirst!: (value: ReturnType<typeof createSafeSuccess>) => void
    let resolveSecond!: (value: ReturnType<typeof createSafeSuccess>) => void
    mockGetProductsByIds.mockClear()
    mockGetProductsByIds
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveSecond = resolve)),
      )

    const productId = ref<number | undefined>(undefined)
    const { api } = mountComposable(productId)
    await flushPromises()
    productId.value = 1
    await flushPromises() // watch fires the first (slow) fetch
    productId.value = 2
    await flushPromises() // watch fires the second (fast) fetch

    // Newer request finishes first, then the stale one resolves late.
    resolveSecond(createSafeSuccess([{ id: 2 }]))
    await flushPromises()
    resolveFirst(createSafeSuccess([{ id: 1 }]))
    await flushPromises()

    expect(mockGetProductsByIds).toHaveBeenCalledTimes(2)
    expect(api.product.value).toMatchObject({ id: 2 })
  })
})

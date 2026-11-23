import { ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { createLogger } from '@scayle/storefront/shared'
import { useRpcClient } from '@client/composables/useRpcClient'
import type { ListingProduct } from '@scayle/storefront/types'

const log = createLogger('cms')

/**
 * Resolves a single CMS-configured product by id for the Single Product
 * spotlight blocks. Shared by every provider (Contentful, Contentstack,
 * Storyblok) so the fetch, error handling, and refetch behavior stay identical
 * regardless of where the id comes from.
 *
 * Await `fetchProduct` once inside the block's `<Suspense>` boundary so the
 * initial product is present in SSR HTML. The internal `watch` refetches whenever
 * the id changes afterward and drops out-of-order responses, so a slow earlier
 * request cannot overwrite a newer one during live-preview editing.
 *
 * @param productId Reactive product id. A falsy id (`0`/unset) clears the product.
 * @returns `product` (the resolved product, or `undefined` while loading or when
 * the id resolves to nothing) and `fetchProduct` (call once with `await` for the
 * Suspense-awaited initial load).
 *
 * @example
 * ```ts
 * const productId = computed(() => contentElement.product || undefined)
 * const { product, fetchProduct } = useCmsSingleProduct(productId)
 * await fetchProduct() // Suspense boundary waits for SSR
 * ```
 */
export function useCmsSingleProduct(
  productId: MaybeRefOrGetter<number | undefined>,
) {
  const rpcClient = useRpcClient()
  const product = ref<ListingProduct>()
  let latestRequest = 0

  const fetchProduct = async () => {
    const id = toValue(productId)
    // Claim this request. Any response that is not the latest is discarded.
    const requestId = ++latestRequest

    if (!id) {
      product.value = undefined
      return
    }

    // Keep the previous tile visible until the new fetch resolves to avoid flicker
    // during live-preview product-id edits.

    const { data, error } = await rpcClient.cms.getProductsByIds({ ids: [id] })

    // A newer fetch started while this one was in flight; drop the stale result.
    if (requestId !== latestRequest) {
      return
    }

    if (error) {
      log.error({
        message: 'Failed to fetch CMS single product by id',
        err: error instanceof Error ? error : new Error(String(error)),
      })
      product.value = undefined
      return
    }

    product.value = data?.[0]
  }

  watch(() => toValue(productId), fetchProduct)

  return { product, fetchProduct }
}

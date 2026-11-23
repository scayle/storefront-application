import { ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { SmartSortingKey } from '@scayle/storefront-api'
import { createLogger } from '@scayle/storefront/shared'
import type { ListingProduct } from '@scayle/storefront/types'
import { useRpcClient } from '@client/composables/useRpcClient'

const log = createLogger('cms')

/** Query a CMS smart sorting slider block resolves its products with. */
export interface CmsSmartSortingQuery {
  /** Smart sorting key the editor picked. No products are fetched without one. */
  smartSortingKey?: SmartSortingKey
  /** Restricts the products to one brand. */
  brandId?: number
  /** Restricts the products to one category. */
  categoryId?: number
  /** Maximum number of products. The Storefront API call defaults to 10. */
  limit?: number
}

/**
 * Resolves the products for a CMS smart sorting slider block. Shared by every
 * provider's `SmartSortingProductsSliderComponent`; each provider only maps its
 * own fields to a `CmsSmartSortingQuery`.
 *
 * Await `fetchProducts` once inside the block's `<Suspense>` boundary so the
 * initial products are present in SSR HTML. The internal `watch` refetches
 * whenever the query changes afterward, for example during live-preview editing.
 *
 * @param query Reactive smart sorting query built from the block's fields.
 * @returns `products` (the resolved products; empty while loading, without a
 * smart sorting key, or when the fetch fails) and `fetchProducts` (call once
 * with `await` for the Suspense-awaited initial load).
 *
 * @example
 * ```ts
 * const query = computed(() => ({
 *   smartSortingKey: contentElement.smart_sorting_key as SmartSortingKey,
 *   limit: contentElement.limit,
 * }))
 * const { products, fetchProducts } = useCmsSmartSortingProducts(query)
 * await fetchProducts() // Suspense boundary waits for SSR
 * ```
 */
export function useCmsSmartSortingProducts(
  query: MaybeRefOrGetter<CmsSmartSortingQuery>,
) {
  const rpcClient = useRpcClient()
  const products = ref<ListingProduct[]>([])

  const fetchProducts = async () => {
    const { smartSortingKey, brandId, categoryId, limit } = toValue(query)
    if (!smartSortingKey) {
      products.value = []
      return
    }

    const { data, error } = await rpcClient.cms.getProductsBySmartSorting({
      smartSortingKey,
      brandId,
      categoryId,
      limit,
    })

    if (error) {
      log.error({
        message: 'Failed to fetch CMS products by smart sorting',
        err: error instanceof Error ? error : new Error(String(error)),
      })
      products.value = []
      return
    }

    products.value = data ?? []
  }

  watch(() => toValue(query), fetchProducts)

  return { products, fetchProducts }
}

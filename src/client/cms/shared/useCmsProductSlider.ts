import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { createLogger } from '@scayle/storefront/shared'
import type { ListingProduct } from '@scayle/storefront/types'
import { useRpcClient } from '@client/composables/useRpcClient'

const log = createLogger('cms')

const hasSameIds = (a: number[], b: number[]) => {
  const aSet = new Set(a)
  const bSet = new Set(b)
  return aSet.size === bSet.size && [...aSet].every((id) => bSet.has(id))
}

/**
 * Resolves the products an editor picked for a CMS product slider block, in
 * the order the editor picked them. Shared by every provider's
 * `ProductSliderComponent`, so the fetch, the ordering, and the refetch rules
 * stay identical regardless of how a provider stores the selection.
 *
 * Await `fetchProducts` once inside the block's `<Suspense>` boundary so the
 * initial products are present in SSR HTML. Afterward, the internal `watch`
 * refetches when the set of ids changes. A reorder in the editor needs no
 * request, because `products` re-sorts the products it already has.
 *
 * @param productIds Reactive list of SCAYLE product ids, in the editor's order.
 * @returns `products` (the resolved products in the order of `productIds`;
 * products the Storefront API returned but the list does not name sort last;
 * empty while loading, for an empty list, or when the fetch fails) and
 * `fetchProducts` (call once with `await` for the Suspense-awaited initial load).
 *
 * @example
 * ```ts
 * const productIds = computed(() => contentElement.product_ids ?? [])
 * const { products, fetchProducts } = useCmsProductSlider(productIds)
 * await fetchProducts() // Suspense boundary waits for SSR
 * ```
 */
export function useCmsProductSlider(productIds: MaybeRefOrGetter<number[]>) {
  const rpcClient = useRpcClient()
  const fetchedProducts = ref<ListingProduct[]>([])

  const products = computed(() => {
    const indexLookup = new Map(
      toValue(productIds).map((id, index) => [id, index]),
    )
    return fetchedProducts.value.toSorted((a, b) => {
      const aIndex = indexLookup.get(a.id)
      const bIndex = indexLookup.get(b.id)
      if (aIndex === undefined) {
        return 1
      }
      if (bIndex === undefined) {
        return -1
      }
      return aIndex - bIndex
    })
  })

  const fetchProducts = async () => {
    const ids = toValue(productIds)
    if (!ids.length) {
      fetchedProducts.value = []
      return
    }

    const { data, error } = await rpcClient.cms.getProductsByIds({ ids })

    if (error) {
      log.error({
        message: 'Failed to fetch CMS products by ids',
        err: error instanceof Error ? error : new Error(String(error)),
      })
      fetchedProducts.value = []
      return
    }

    fetchedProducts.value = data ?? []
  }

  watch(
    () => toValue(productIds),
    async (newIds, oldIds) => {
      if (hasSameIds(newIds, oldIds ?? [])) {
        return
      }
      await fetchProducts()
    },
  )

  return { products, fetchProducts }
}

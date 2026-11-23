import type { ListingProduct } from '@scayle/storefront/types'
import { createLogger } from '@scayle/storefront/shared'
import { useLocalStorage } from '@vueuse/core'
import { ref } from 'vue'
import type { Ref } from 'vue'
import { MAX_RECENTLY_VIEWED_PRODUCTS } from '@client/constants'
import { useStorefrontConfig } from './useStorefrontConfig'
import { useRpcClient } from './useRpcClient'

const log = createLogger('recently-viewed')

interface UseRecentlyViewedProductsReturn {
  /** A reactive array of the fetched, full Product objects. */
  products: Ref<ListingProduct[]>

  /** A reactive flag indicating if the product data is being fetched. */
  loading: Ref<boolean>

  /** A reactive container for any errors that occur during fetching. */
  error: Ref<Error | undefined>

  /** A string indicating the status of the data request */
  status: Ref<'pending' | 'success' | 'error'>

  /**
   * Adds a product id to the list of recently viewed products and persists it to local storage.
   *
   * Because this function uses local storage, it is not available on the server.
   *
   * @throws Error if the function is called on the server.
   *
   * @param productId - The id of the product to add to the list of recently viewed products.
   */
  addProductId: (productId: number) => void

  /**
   * Loads products based on the product ids previously added.
   * Initially all products within the persisted list are loaded. Subsequent calls only load products that are not already loaded.
   *
   * Because this function uses local storage, it is not available on the server.
   *
   * @throws Error if the function is called on the server.
   *
   * @returns A promise that resolves when the products have been loaded.
   */
  loadMissingProducts: () => Promise<void>
}
/**
 * This composable can be used to track a short history of products a customer/user has previously viewed using local storage.
 * It maintains up to 10 recently viewed products and provides methods to add new products and fetch their full details.
 *
 * @param options An object containing parameters and options for the loading the products.
 * @param options.with The fields to include in the response.
 * @param options.pricePromotionKey The price promotion key.
 *
 * @returns An object containing the recently viewed products list, loading state, error and status information.
 */

interface UseRecentlyViewedProductsOptions {
  pricePromotionKey?: string
}

const loadingPromise = new Map<string, Promise<void>>()

// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/discovery/recommendations/recently-viewed-products
export function useRecentlyViewedProducts(
  options?: UseRecentlyViewedProductsOptions,
): UseRecentlyViewedProductsReturn {
  const { country } = useStorefrontConfig()

  const recentlyViewedProductsIds = useLocalStorage<number[]>(
    `${country.value.shopCountryId}-recently-viewed-products`,
    [],
  )
  const products = ref<ListingProduct[]>([])
  const loading = ref(false)
  const error = ref<Error | undefined>(undefined)
  const status = ref<'pending' | 'success' | 'error'>('pending')

  const rpcClient = useRpcClient()

  const addProductId = (productId: number) => {
    if (import.meta.env.SSR) {
      throw new Error(
        'useRecentlyViewedProducts uses local storage. addProductId is therefore not available on the server.',
      )
    }
    const productIds = [...recentlyViewedProductsIds.value]

    if (productIds.includes(productId)) {
      productIds.splice(productIds.indexOf(productId), 1)
    }
    productIds.unshift(productId)
    if (productIds.length > MAX_RECENTLY_VIEWED_PRODUCTS) {
      productIds.pop()
    }
    recentlyViewedProductsIds.value = productIds
  }

  const loadMissingProducts = async () => {
    if (import.meta.env.SSR) {
      throw new Error(
        'useRecentlyViewedProducts uses local storage. fetchProducts is therefore not available on the server.',
      )
    }
    const loadedProductIds = new Set(
      products.value.map((product) => product.id),
    )
    const missingProductIds = recentlyViewedProductsIds.value.filter(
      (id) => !loadedProductIds.has(id),
    )

    const promiseKey = missingProductIds.join(',')
    // If there's already a loading operation in progress, return that promise
    if (loadingPromise.has(promiseKey)) {
      return loadingPromise.get(promiseKey)
    }

    const load = async (): Promise<void> => {
      loading.value = true
      status.value = 'pending'

      if (missingProductIds.length > 0) {
        const { data, error: rpcError } = await rpcClient.cms.getProductsByIds({
          ids: missingProductIds,
          pricePromotionKey: options?.pricePromotionKey,
        })

        if (rpcError) {
          log.warn({
            message: 'Failed to load recently viewed products',
            err:
              rpcError instanceof Error
                ? rpcError
                : new Error(String(rpcError)),
          })
          error.value =
            rpcError instanceof Error ? rpcError : new Error(String(rpcError))
          status.value = 'error'
          loading.value = false
          loadingPromise.delete(promiseKey)
          return
        }

        products.value.push(...(data ?? []))
      }

      const sortOrderMap = new Map(
        recentlyViewedProductsIds.value.map((id, index) => [id, index]),
      )

      products.value = products.value
        .toSorted((a, b) => {
          const aIndex = sortOrderMap.get(a.id)
          const bIndex = sortOrderMap.get(b.id)
          // Make sure products not in the recently viewed list are sorted to the end
          if (aIndex === undefined) {
            return 1
          }
          if (bIndex === undefined) {
            return -1
          }

          return aIndex - bIndex
        })
        .slice(0, MAX_RECENTLY_VIEWED_PRODUCTS)
      status.value = 'success'
      loading.value = false
      loadingPromise.delete(promiseKey)
    }

    const promise = load()
    loadingPromise.set(promiseKey, promise)

    return promise
  }

  return {
    addProductId,
    loadMissingProducts,
    products,
    loading,
    error,
    status,
  }
}

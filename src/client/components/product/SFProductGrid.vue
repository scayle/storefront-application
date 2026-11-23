<template>
  <div ref="productGrid" class="grid w-full grid-cols-12 gap-4">
    <div v-if="!products.length" class="col-span-12 max-lg:w-fit">
      <slot name="no-results">
        <SFProductListNoResults
          :category="category"
          :applied-filters="appliedFilters"
          :product-list-type="productListType"
          :product-list-id="productListId"
        />
      </slot>
    </div>
    <template v-else>
      <!--
        The first card's image is the listing's LCP element, so it is the only
        one that claims `fetchpriority="high"`. Every other card relies on
        `getProductImageLoading` for its eager/lazy hint.
      -->
      <SFProductCard
        v-for="(product, index) in products"
        :key="`product-${product.id}`"
        class="col-span-6 mb-5 w-full md:col-span-4 xl:col-span-3"
        data-testid="product-item"
        :product="product"
        :product-list-type="productListType"
        :product-list-id="productListId"
        :image-type="imageType"
        :product-index="index"
        :fetch-priority="index === 0 ? 'high' : undefined"
        @intersect-product="onProductIntersects(index)"
        @select-product="onProductSelect(product, index)"
      />
    </template>

    <SFPagination
      v-if="pagination && pagination.hasMultiplePages"
      :pagination="pagination"
      class="col-span-12 mt-6"
      @reset-focus="onResetFocus"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  ListingProduct,
  Pagination,
  AppliedFilters,
  Category,
} from '@scayle/storefront/types'
import type { AnalyticsProductListType } from '@scayle/storefront-api'
import SFProductCard from '@client/components/product/SFProductCard.vue'
import SFPagination from '@client/components/ui/pagination/SFPagination.vue'
import SFProductListNoResults from '@client/components/product/SFProductListNoResults.vue'
import { useProductListTracking } from '@client/composables/tracking/useProductListTracking'
import { getFirstFocusable } from '@client/utils/focus'
import { useTemplateRef, watch } from 'vue'

const { products, pagination, productListType, productListId, imageType } =
  defineProps<{
    /** Products of the current page. */
    products: ListingProduct[]
    /** Category the grid lists, when it is a category listing. */
    category?: Category
    /** Applied filters, passed to the default no-results message for its reset button. */
    appliedFilters: AppliedFilters
    /** Pagination of the list; `totalItems` is the SCAYLE Analytics `total`. */
    pagination: Pagination
    /**
     * Surface of the grid: `category` or `search_results`. The SCAYLE Analytics
     * `product_list_type` and the GA4 `item_list_name`.
     */
    productListType: AnalyticsProductListType
    /**
     * Identifier within the surface: category id or search term. The SCAYLE
     * Analytics `product_list_id` and the GA4 `item_list_id`.
     */
    productListId?: string
    /** Stable `imageType` value of the selected image view, forwarded to every card. */
    imageType?: string
  }>()

defineSlots<{
  /**
   * Replaces the message shown when `products` is empty. Defaults to
   * `SFProductListNoResults`, the category listing message.
   */
  'no-results'?: () => unknown
}>()

const { onProductIntersects, onProductSelect } = useProductListTracking(
  () => products,
  {
    productListType: () => productListType,
    productListId: () => productListId,
    total: () => pagination.totalItems,
    itemsPerPage: () => pagination.itemsPerPage,
  },
)

const productGridRef = useTemplateRef('productGrid')
let resetFocus = false
const onResetFocus = async () => {
  resetFocus = true
}

watch(
  () => pagination?.currentPage,
  () => {
    if (resetFocus) {
      const firstFocusable = getFirstFocusable(productGridRef.value)
      if (firstFocusable) {
        firstFocusable.focus()
      }
    }
    resetFocus = false
  },
  { flush: 'post' },
)
</script>

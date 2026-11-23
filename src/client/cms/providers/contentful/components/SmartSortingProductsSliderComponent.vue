<template>
  <SFProductSlider
    :title="contentElement.fields.title ?? ''"
    :products="products"
    class="w-full"
    :class="{ 'pt-7': !contentElement.fields.title }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SmartSortingKey } from '@scayle/storefront-api'
import type { TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import { useCmsSmartSortingProducts } from '@client/cms/shared/useCmsSmartSortingProducts'

const { contentElement } = defineProps<{
  contentElement: TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse
}>()

// See https://scayle.dev/documentation/the-basics/products/sorting#smart-sorting-keys for all available smart sorting keys.
const SORTING_KEY_MAP = {
  'Sales Push': SmartSortingKey.SALES_PUSH,
  'New Arrivals': SmartSortingKey.NEW_ARRIVALS,
  'Balanced Offerings': SmartSortingKey.BALANCED_OFFERINGS,
  'Inventory Optimization': SmartSortingKey.INVENTORY_OPTIMIZATION,
  'Luxury Promotion': SmartSortingKey.LUXURY_PROMOTION,
  'Stock Coverage': SmartSortingKey.STOCK_COVERAGE,
  Topseller: SmartSortingKey.TOPSELLER,
  'Revenue Max': SmartSortingKey.REVENUE_MAX,
  'Recently Popular': SmartSortingKey.RECENTLY_POPULAR,
  Trending: SmartSortingKey.TRENDING,
} as const

const query = computed(() => ({
  smartSortingKey:
    SORTING_KEY_MAP[
      contentElement.fields.smartSortingKey as keyof typeof SORTING_KEY_MAP
    ],
  brandId: contentElement.fields.brandId,
  categoryId: contentElement.fields.categoryId,
  limit: contentElement.fields.limit ?? 10,
}))

const { products, fetchProducts } = useCmsSmartSortingProducts(query)

await fetchProducts()
</script>

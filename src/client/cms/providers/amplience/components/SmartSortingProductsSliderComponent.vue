<template>
  <SFProductSlider
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="smart_sorting_key"
    :title="title"
    :products="products"
    class="w-full"
    :class="{ 'pt-7': !title }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SmartSortingKey } from '@scayle/storefront-api'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import { useCmsSmartSortingProducts } from '@client/cms/shared/useCmsSmartSortingProducts'
import type { SmartSortingProductsSliderComponent as SmartSortingProductsSliderComponentType } from '@shared/types/cms/amplience'

const { contentElement } = defineProps<{
  contentElement: SmartSortingProductsSliderComponentType
}>()

const title = computed(() => contentElement.headline ?? '')

const query = computed(() => ({
  smartSortingKey: contentElement.smart_sorting_key as
    SmartSortingKey | undefined,
  brandId: contentElement.brand_id,
  categoryId: contentElement.category_id,
  limit: contentElement.limit,
}))

const { products, fetchProducts } = useCmsSmartSortingProducts(query)

await fetchProducts()
</script>

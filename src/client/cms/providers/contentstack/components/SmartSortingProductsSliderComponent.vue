<template>
  <SFProductSlider
    :title="contentElement.display_title ?? contentElement.title ?? ''"
    :products="products"
    class="w-full"
    :class="{ 'pt-7': !contentElement.display_title && !contentElement.title }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SmartSortingProductsSliderComponent } from '@shared/types/cms/contentstack'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import { useCmsSmartSortingProducts } from '@client/cms/shared/useCmsSmartSortingProducts'

const { contentElement } = defineProps<{
  contentElement: SmartSortingProductsSliderComponent
}>()

const query = computed(() => ({
  smartSortingKey: contentElement.smart_sorting_key,
  brandId: contentElement.brand_id ?? undefined,
  categoryId: contentElement.category_id ?? undefined,
  limit: contentElement.limit ?? undefined,
}))

const { products, fetchProducts } = useCmsSmartSortingProducts(query)

await fetchProducts()
</script>

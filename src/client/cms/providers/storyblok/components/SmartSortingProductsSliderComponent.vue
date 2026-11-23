<template>
  <SFProductSlider
    v-editable="contentElement"
    :title="(contentElement.title as string) ?? ''"
    :products="products"
    class="w-full"
    :class="{ 'pt-7': !contentElement.title }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SmartSortingKey } from '@scayle/storefront-api'
import type { SmartSortingProductsSliderComponent } from '@shared/types/cms/storyblok'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import { useCmsSmartSortingProducts } from '@client/cms/shared/useCmsSmartSortingProducts'

const { contentElement } = defineProps<{
  contentElement: SmartSortingProductsSliderComponent
}>()

/** Storyblok number fields are free-text strings, so authors can save any text. */
const parseOptionalInt = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

const query = computed(() => ({
  smartSortingKey: contentElement.smartSortingKey as
    SmartSortingKey | undefined,
  brandId: parseOptionalInt(contentElement.brandId),
  categoryId: parseOptionalInt(contentElement.categoryId),
  limit: parseOptionalInt(contentElement.limit),
}))

const { products, fetchProducts } = useCmsSmartSortingProducts(query)

await fetchProducts()
</script>

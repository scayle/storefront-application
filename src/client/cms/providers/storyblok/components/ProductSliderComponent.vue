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
import type { ProductSliderComponent } from '@shared/types/cms/storyblok'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import { useCmsProductSlider } from '@client/cms/shared/useCmsProductSlider'

const { contentElement } = defineProps<{
  contentElement: ProductSliderComponent
}>()

const productIds = computed<number[]>(() => {
  const items = (contentElement.products || []) as Array<{ id: number }>
  return items.map((item) => item.id)
})

const { products, fetchProducts } = useCmsProductSlider(productIds)

await fetchProducts()
</script>

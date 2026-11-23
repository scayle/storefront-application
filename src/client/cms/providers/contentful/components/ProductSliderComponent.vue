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
import type { TypeProductSliderComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import { useCmsProductSlider } from '@client/cms/shared/useCmsProductSlider'

const { contentElement } = defineProps<{
  contentElement: TypeProductSliderComponentWithoutUnresolvableLinksResponse
}>()

const productIds = computed<number[]>(() => {
  const items = (contentElement.fields.products || []) as Array<{ id: number }>
  return items.map((item) => item.id)
})

const { products, fetchProducts } = useCmsProductSlider(productIds)

await fetchProducts()
</script>

<template>
  <SFProductSlider
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="product_ids"
    :title="title"
    :products="products"
    class="w-full"
    :class="{ 'pt-7': !title }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFProductSlider from '@client/components/product/slider/SFProductSlider.vue'
import { useCmsProductSlider } from '@client/cms/shared/useCmsProductSlider'
import type { ProductSliderComponent as ProductSliderComponentType } from '@shared/types/cms/amplience'

const { contentElement } = defineProps<{
  contentElement: ProductSliderComponentType
}>()

const title = computed(() => contentElement.headline ?? '')

/** Amplience delivers the selection as a plain array of SCAYLE product IDs. */
const productIds = computed<number[]>(() => contentElement.product_ids ?? [])

const { products, fetchProducts } = useCmsProductSlider(productIds)

await fetchProducts()
</script>

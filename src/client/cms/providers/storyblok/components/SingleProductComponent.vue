<template>
  <SFSingleProductSpotlight
    v-editable="contentElement"
    class="w-full"
    :product="product"
    :badge="contentElement.badge"
    :high-urgency="contentElement.highUrgency"
    :background-color="contentElement.backgroundColor"
    :text-color="contentElement.textColor"
    :show-countdown="contentElement.showCountdown"
    :countdown-end-date="contentElement.countdownEndDate"
  />
</template>

<script setup lang="ts">
/** Storyblok adapter: resolves the configured product id and renders `SFSingleProductSpotlight`. */
import { computed } from 'vue'
import type { SingleProductComponent } from '@shared/types/cms/storyblok'
import { useCmsSingleProduct } from '@client/cms/shared/useCmsSingleProduct'
import SFSingleProductSpotlight from '@client/components/product/SFSingleProductSpotlight.vue'

const { contentElement } = defineProps<{
  contentElement: SingleProductComponent
}>()

// Product ID is a plain integer; `0`/unset is treated as no selection.
const productId = computed<number | undefined>(
  () => Number(contentElement.product) || undefined,
)

const { product, fetchProduct } = useCmsSingleProduct(() => productId.value)

await fetchProduct()
</script>

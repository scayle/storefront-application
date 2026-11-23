<template>
  <SFSingleProductSpotlight
    class="w-full"
    :product="product"
    :badge="contentElement.badge"
    :high-urgency="contentElement.high_urgency ?? undefined"
    :background-color="contentElement.background_color"
    :text-color="contentElement.text_color"
    :show-countdown="contentElement.show_countdown ?? undefined"
    :countdown-end-date="contentElement.countdown_end_date ?? undefined"
  />
</template>

<script setup lang="ts">
/** Contentstack adapter: resolves the configured product id and renders `SFSingleProductSpotlight`. */
import { computed } from 'vue'
import type { SingleProductComponent } from '@shared/types/cms/contentstack'
import { useCmsSingleProduct } from '@client/cms/shared/useCmsSingleProduct'
import SFSingleProductSpotlight from '@client/components/product/SFSingleProductSpotlight.vue'

const { contentElement } = defineProps<{
  contentElement: SingleProductComponent
}>()

// `useCmsSingleProduct` treats `0`, an unset id, as no selection.
const productId = computed(() => contentElement.product)

const { product, fetchProduct } = useCmsSingleProduct(() => productId.value)

await fetchProduct()
</script>

<template>
  <SFSingleProductSpotlight
    class="w-full"
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    data-amplience-field-id="product_id"
    :product="product"
    :badge="contentElement.badge"
    :high-urgency="contentElement.high_urgency"
    :background-color="contentElement.background_color"
    :text-color="contentElement.text_color"
    :show-countdown="contentElement.show_countdown"
    :countdown-end-date="contentElement.countdown_end_date"
  />
</template>

<script setup lang="ts">
/** Amplience adapter: resolves the configured product id and renders `SFSingleProductSpotlight`. */
import { computed } from 'vue'
import type { SingleProductComponent as SingleProductComponentType } from '@shared/types/cms/amplience'
import { useCmsSingleProduct } from '@client/cms/shared/useCmsSingleProduct'
import SFSingleProductSpotlight from '@client/components/product/SFSingleProductSpotlight.vue'

const { contentElement } = defineProps<{
  contentElement: SingleProductComponentType
}>()

// `useCmsSingleProduct` treats `0`, an unset id, as no selection.
const productId = computed(() => contentElement.product_id)

const { product, fetchProduct } = useCmsSingleProduct(() => productId.value)

await fetchProduct()
</script>

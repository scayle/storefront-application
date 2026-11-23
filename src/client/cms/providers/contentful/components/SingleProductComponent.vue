<template>
  <SFSingleProductSpotlight
    class="w-full"
    :product="product"
    :badge="contentElement.fields.badge"
    :high-urgency="contentElement.fields.highUrgency"
    :background-color="contentElement.fields.backgroundColor"
    :text-color="contentElement.fields.textColor"
    :show-countdown="contentElement.fields.showCountdown"
    :countdown-end-date="contentElement.fields.countdownEndDate"
  />
</template>

<script setup lang="ts">
/** Contentful adapter: resolves the configured product id and renders `SFSingleProductSpotlight`. */
import { computed } from 'vue'
import type { TypeSingleProductWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import { useCmsSingleProduct } from '@client/cms/shared/useCmsSingleProduct'
import SFSingleProductSpotlight from '@client/components/product/SFSingleProductSpotlight.vue'

const { contentElement } = defineProps<{
  contentElement: TypeSingleProductWithoutUnresolvableLinksResponse
}>()

// `useCmsSingleProduct` treats `0`, an unset id, as no selection.
const productId = computed(() => contentElement.fields.product)

const { product, fetchProduct } = useCmsSingleProduct(() => productId.value)

await fetchProduct()
</script>

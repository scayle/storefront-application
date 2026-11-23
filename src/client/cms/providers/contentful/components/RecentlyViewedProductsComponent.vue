<template>
  <SFRecentlyViewedProductSlider :class="paddingClasses" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TypeRecentlyViewedProductsComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import SFRecentlyViewedProductSlider from '@client/components/product/slider/SFRecentlyViewedProductSlider.vue'
import { resolvePaddingClass } from '@client/cms/shared/alignment'

const { contentElement } = defineProps<{
  contentElement: TypeRecentlyViewedProductsComponentWithoutUnresolvableLinksResponse
}>()

const paddingClasses = computed(() =>
  resolvePaddingClass(contentElement.fields?.padding),
)
</script>

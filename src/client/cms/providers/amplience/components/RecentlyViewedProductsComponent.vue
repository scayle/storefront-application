<template>
  <SFRecentlyViewedProductSlider
    :data-amplience-entry-id="contentElement._meta?.deliveryId"
    :class="paddingClasses"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SFRecentlyViewedProductSlider from '@client/components/product/slider/SFRecentlyViewedProductSlider.vue'
import { resolvePaddingClass } from '@client/cms/shared/alignment'
import type { RecentlyViewedProductsComponent as RecentlyViewedProductsComponentType } from '@shared/types/cms/amplience'

const { contentElement } = defineProps<{
  contentElement: RecentlyViewedProductsComponentType
}>()

const paddingClasses = computed(() =>
  resolvePaddingClass(contentElement.padding),
)
</script>

<template>
  <SFRecentlyViewedProductSlider :class="paddingClasses" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RecentlyviewedproductsComponent } from '@shared/types/cms/contentstack'
import SFRecentlyViewedProductSlider from '@client/components/product/slider/SFRecentlyViewedProductSlider.vue'
import { resolvePaddingClass } from '@client/cms/shared/alignment'

const { contentElement } = defineProps<{
  contentElement: RecentlyviewedproductsComponent
}>()

const paddingClasses = computed(() =>
  resolvePaddingClass(contentElement.padding ?? undefined),
)
</script>

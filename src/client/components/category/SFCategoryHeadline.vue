<template>
  <h1
    class="flex min-w-0 items-baseline gap-1 heading-section-1"
    data-testid="active-category-breadcrumb"
  >
    {{ category.name }}
    <SFHeadlineItemCount :count="productsCount" />
  </h1>
</template>

<script setup lang="ts">
import type { Category } from '@scayle/storefront/types'
import SFHeadlineItemCount from '@client/components/ui/core/SFHeadlineItemCount.vue'

defineProps<{
  /** Currently selected category shown as the page title. */
  category: Category
  /**
   * Total product count for the listing. Omitted while deferred listing data
   * is still loading.
   */
  productsCount?: number
}>()
</script>

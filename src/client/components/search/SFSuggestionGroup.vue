<template>
  <div class="space-y-3">
    <div class="mb-4 flex items-center space-x-1 heading-section-3">
      <span class="text-lg">{{ title }}</span>
      <SFCountBadge :count="count" data-testid="suggestion-group-counter" />
    </div>
    <ul class="space-y-2">
      <slot />
    </ul>
  </div>
</template>

<script setup lang="ts">
import SFCountBadge from '@client/components/ui/core/SFCountBadge.vue'

defineProps<{
  /** Localized group title (e.g. "Products", "Categories"). */
  title: string
  /** Number of suggestions in this group. */
  count: number
}>()
</script>

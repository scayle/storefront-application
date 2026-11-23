<template>
  <span
    v-if="count > 0"
    class="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[10px]! leading-none font-normal text-white"
    :class="{ 'absolute top-0 right-0 z-10': variant === 'corner' }"
  >
    {{ count }}
  </span>
</template>

<script setup lang="ts">
const { count, variant = 'inline' } = defineProps<{
  /** Numeric count shown on the badge. The badge is hidden when 0 or less. */
  count: number
  /**
   * Placement of the badge.
   * - `'inline'` (default) flows within the surrounding content — used on the
   *   filter toggle button, filter group headers, and other small headlines.
   * - `'corner'` overlays the top-right of a `relative` parent — used on the
   *   header utility icon buttons (wishlist, basket, deals).
   */
  variant?: 'inline' | 'corner'
}>()
</script>

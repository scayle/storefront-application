<template>
  <p
    v-if="message"
    v-bind="$attrs"
    data-testid="low-stock-banner"
    :class="sizeClasses"
    class="flex items-center justify-center bg-status-warning-light text-sm font-semibold text-primary"
  >
    {{ message }}
  </p>
  <div
    class="sr-only"
    role="status"
    aria-atomic="true"
    data-testid="low-stock-banner-announcer"
  >
    <span v-if="message">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LowStockIndicatorSize } from '@client/utils/constants'
import type { LowStockIndicatorSize as LowStockIndicatorSizeType } from '@client/utils/constants'

defineOptions({ inheritAttrs: false })

const { message, size = LowStockIndicatorSize.LARGE } = defineProps<{
  /**
   * Resolved low-stock copy from the parent (e.g. i18n). `undefined` or empty
   * string hides the visual banner. The live region stays mounted so updates
   * are announced.
   */
  message?: string
  /**
   * Visual size from the design system. Large for PDP and basket summary,
   * small for basket line items and product cards.
   */
  size?: LowStockIndicatorSizeType
}>()

const sizeClasses = computed(() =>
  size === LowStockIndicatorSize.SMALL
    ? 'h-6 rounded-md p-1'
    : 'h-8 rounded-lg p-2',
)
</script>

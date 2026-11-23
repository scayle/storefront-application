<template>
  <div
    v-if="size === 'large'"
    class="flex items-center gap-x-3"
    data-testid="countdown-skeleton"
  >
    <span class="text-sm font-bold whitespace-nowrap">
      {{ $t('countdown.ends_in') }}
    </span>
    <div
      class="inline-flex items-stretch overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm"
    >
      <template v-for="(unit, index) in COUNTDOWN_LARGE_UNIT_COUNT" :key="unit">
        <span v-if="index > 0" class="my-2 w-px self-stretch bg-gray-300" />
        <div
          class="flex min-w-16 flex-col items-center justify-center gap-y-0.5 px-3 py-1.5"
        >
          <SFSkeletonLoader type="custom" class="h-8 w-9 rounded-md" />
          <SFSkeletonLoader type="custom" class="h-3 w-6 rounded-md" />
        </div>
      </template>
    </div>
  </div>
  <div
    v-else
    class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1"
    data-testid="countdown-skeleton"
  >
    <SFSkeletonLoader type="custom" class="h-4 w-24 rounded-md" />
  </div>
</template>

<script setup lang="ts">
import SFSkeletonLoader from '@client/components/ui/core/SFSkeletonLoader.vue'
import { COUNTDOWN_LARGE_UNIT_COUNT } from '@client/utils/constants'

/**
 * SSR placeholder for the Countdown Timer CMS component. The countdown itself
 * runs client-only (the timer is inert during SSR), so without a placeholder
 * the server emits nothing and the countdown pops in on mount, shifting any
 * content below it. This skeleton reserves the resolved variant's footprint
 * during the SSR-to-hydration gap, mirroring the SFDealTimer fallback.
 *
 * The `size` is static CMS content known server-side, so the correctly-sized
 * placeholder (small pill vs. large boxed cells) can be rendered without
 * running the timer. The large variant always reserves the urgent
 * (hours/minutes/seconds) multi-cell footprint: the standard/urgent split
 * depends on the live clock, and reading it during SSR or the first client
 * render is exactly what caused the hydration mismatch this component guards
 * against. A countdown with more than 24h left therefore shifts from the
 * reserved three cells to the standard single cell when the live timer swaps
 * in. This skeleton is only ever rendered as a `<ClientOnly>` fallback, so it
 * is unmounted the moment the timer mounts.
 */
const { size } = defineProps<{
  /**
   * Which countdown variant to reserve space for. Mirrors the `isLarge` branch
   * in the provider wrappers.
   */
  size: 'small' | 'large'
  /**
   * ISO date string for the countdown target. Accepted for prop consistency
   * with the live timer. The large variant ignores this value and always
   * reserves the urgent multi-cell layout, so countdowns with more than 24h
   * remaining shift to the standard single cell when the live timer mounts.
   */
  timeUntil?: string
}>()
</script>

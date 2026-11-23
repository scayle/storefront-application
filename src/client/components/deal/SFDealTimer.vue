<template>
  <div
    v-if="!isClientMounted || state !== 'finished'"
    class="inline-flex items-center rounded-sm"
    :class="isSlim ? 'h-5' : 'h-6 border p-px'"
    :style="style"
  >
    <IconAvailabilityComingsoon v-if="!isSlim" class="ml-1.5 size-2.5" />
    <ClientOnly>
      <template #fallback>
        <div class="mx-1 flex">
          <SFSkeletonLoader
            v-for="n in COUNTDOWN_LOADER_UNITS"
            :key="n"
            type="custom"
            class="mx-1.5 h-3 w-3.5! rounded-md"
          />
        </div>
      </template>
      <SFFadeInTransition :duration="300">
        <span
          v-if="state === 'standard'"
          class="px-1.5 text-md font-semibold whitespace-nowrap"
        >
          {{ $t('countdown.days_left', days) }}
        </span>
        <div
          v-else-if="state === 'urgent'"
          class="flex items-center gap-x-1 px-1.5 text-md whitespace-nowrap"
        >
          <span v-if="!isSlim" class="font-semibold">{{
            $t('countdown.ends_in')
          }}</span>
          <SFCountdown
            :time-until="timeUntil"
            show-units
            show-separators
            unit-size="short"
          />
        </div>
      </SFFadeInTransition>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue'
import { useMounted } from '@vueuse/core'
import SFCountdown from '@client/components/ui/core/SFCountdown.vue'
import SFFadeInTransition from '@client/components/ui/transitions/SFFadeInTransition.vue'
import SFSkeletonLoader from '@client/components/ui/core/SFSkeletonLoader.vue'
import ClientOnly from '@client/components/ui/core/ClientOnly.vue'
import IconAvailabilityComingsoon from '@client/assets/icons/availability/comingsoon.svg'
import {
  COUNTDOWN_TIMER_KEY,
  useCountdownTimer,
} from '@client/composables/useCountdownTimer'
import { COUNTDOWN_LOADER_UNITS } from '@client/utils/constants'
import type { CSSProperties } from 'vue'

const {
  colorStyle,
  timeUntil,
  isSlim = false,
} = defineProps<{
  /** ISO date string for the countdown target. */
  timeUntil: string
  /** Color configuration from the promotion or campaign. */
  colorStyle: CSSProperties
  /** Whether to render the timer in a slim variant. */
  isSlim?: boolean
}>()

const timer = useCountdownTimer(() => timeUntil)
provide(COUNTDOWN_TIMER_KEY, timer)
const { state, days } = timer

const isClientMounted = useMounted()

const style = computed(() => ({
  ...colorStyle,
  borderColor: colorStyle.color,
  stroke: colorStyle.color,
}))
</script>

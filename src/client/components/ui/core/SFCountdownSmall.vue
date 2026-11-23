<template>
  <div
    class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-semibold whitespace-nowrap text-primary"
    :data-countdown-state="state"
    data-testid="countdown-small"
  >
    <span v-if="state === 'standard'">
      {{ $t('countdown.days_left', days) }}
    </span>
    <SFCountdown
      v-else
      :time-until="timeUntil"
      show-units
      show-separators
      unit-size="short"
    />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import SFCountdown from '@client/components/ui/core/SFCountdown.vue'
import {
  COUNTDOWN_TIMER_KEY,
  useCountdownTimer,
} from '@client/composables/useCountdownTimer'

const { timeUntil } = defineProps<{
  /**
   * ISO date string representing the target date and time for the countdown.
   */
  timeUntil: string
}>()

const sharedTimer = inject(COUNTDOWN_TIMER_KEY, null)
const { state, days } = sharedTimer ?? useCountdownTimer(() => timeUntil)
</script>

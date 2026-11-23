<template>
  <div
    class="flex items-center gap-x-3"
    :data-countdown-state="state"
    data-testid="countdown-large"
  >
    <span class="text-sm font-bold whitespace-nowrap">
      {{ $t('countdown.ends_in') }}
    </span>
    <div
      class="inline-flex items-stretch overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm"
    >
      <div
        v-if="state === 'standard'"
        class="flex min-w-16 flex-col items-center justify-center gap-y-0.5 px-3 py-1.5"
        data-testid="countdown-cell"
      >
        <span class="text-3xl font-bold tabular-nums">{{ days }}</span>
        <span class="text-sm text-secondary capitalize">
          {{ $t('global.days', days) }}
        </span>
      </div>
      <template v-else>
        <template v-for="(unit, index) in units" :key="unit.key">
          <span
            v-if="index > 0"
            class="my-2 w-px self-stretch bg-gray-300"
            data-testid="countdown-divider"
          />
          <div
            class="flex min-w-16 flex-col items-center justify-center gap-y-0.5 px-3 py-1.5"
            data-testid="countdown-cell"
          >
            <span class="text-3xl font-bold tabular-nums">
              {{ unit.value.toString().padStart(2, '0') }}
            </span>
            <span class="text-sm text-secondary capitalize">{{
              unit.label
            }}</span>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  COUNTDOWN_TIMER_KEY,
  useCountdownTimer,
} from '@client/composables/useCountdownTimer'
import { useCountdownFinished } from '@client/composables/useCountdownFinished'

const { timeUntil } = defineProps<{
  /**
   * ISO date string representing the target date and time for the countdown.
   */
  timeUntil: string
}>()

const emit = defineEmits<{ finished: [] }>()

const { t } = useI18n()

const sharedTimer = inject(COUNTDOWN_TIMER_KEY, null)
const { state, days, hours, minutes, seconds } =
  sharedTimer ?? useCountdownTimer(() => timeUntil)

/**
 * Boxed time units shown in the urgent state (≤ 24h remaining). Days are
 * omitted because the urgent state always has `days === 0`; the standard state
 * renders the day cell instead. The CSS `capitalize` class title-cases each
 * label to match the design (Hours / Min / Sec): hours uses the full label,
 * minutes and seconds use the abbreviated ones.
 */
const units = computed(() => [
  {
    key: 'hours',
    value: hours.value,
    label: t('global.hours', hours.value),
  },
  {
    key: 'minutes',
    value: minutes.value,
    label: t('global.minutes_short', minutes.value),
  },
  {
    key: 'seconds',
    value: seconds.value,
    label: t('global.seconds_short', seconds.value),
  },
])

useCountdownFinished(emit, state)
</script>

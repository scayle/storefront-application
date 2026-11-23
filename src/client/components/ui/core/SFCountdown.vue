<template>
  <div class="flex items-center gap-x-1 px-1.5 text-sm font-semibold">
    <template v-for="unit in units" :key="unit.key">
      <span v-if="unit.hasSeparatorBefore">:</span>
      <div v-if="unit.visible" class="inline-flex items-center gap-x-0.5">
        <span class="tabular-nums">
          {{ unit.value.toString().padStart(2, '0') }}
        </span>
        <span v-if="showUnits">{{ unit.label }}</span>
      </div>
    </template>
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

const {
  showUnits = false,
  showSeparators = false,
  unitSize = 'long',
  timeUntil,
} = defineProps<{
  /**
   * ISO date string representing the target date and time for the countdown.
   */
  timeUntil: string
  /**
   * Whether to display unit labels (days, hours, minutes, seconds) next to the numbers.
   */
  showUnits?: boolean
  /**
   * Whether to display colon separators between time unit groups.
   */
  showSeparators?: boolean
  /**
   * Length of unit labels. Short uses abbreviated forms (hrs, min, sec), long uses full words.
   */
  unitSize?: 'short' | 'long'
}>()

const emit = defineEmits<{ finished: [] }>()

const { t } = useI18n()

const sharedTimer = inject(COUNTDOWN_TIMER_KEY, null)
const { state, days, hours, minutes, seconds } =
  sharedTimer ?? useCountdownTimer(() => timeUntil)

const isUrgentDigitalClock = computed(() => showSeparators && days.value === 0)

const units = computed(() => [
  {
    key: 'days',
    value: days.value,
    label:
      unitSize === 'short'
        ? t('global.days_short', days.value)
        : t('global.days', days.value),
    visible: days.value > 0,
    hasSeparatorBefore: false,
  },
  {
    key: 'hours',
    value: hours.value,
    label:
      unitSize === 'short'
        ? t('global.hours_short', hours.value)
        : t('global.hours', hours.value),
    visible: true,
    hasSeparatorBefore: false,
  },
  {
    key: 'minutes',
    value: minutes.value,
    label:
      unitSize === 'short'
        ? t('global.minutes_short', minutes.value)
        : t('global.minutes', minutes.value),
    visible: true,
    hasSeparatorBefore: isUrgentDigitalClock.value,
  },
  {
    key: 'seconds',
    value: seconds.value,
    label:
      unitSize === 'short'
        ? t('global.seconds_short', seconds.value)
        : t('global.seconds', seconds.value),
    visible: days.value === 0,
    hasSeparatorBefore: isUrgentDigitalClock.value,
  },
])

useCountdownFinished(emit, state)
</script>

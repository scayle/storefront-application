<template>
  <div
    class="flex flex-col justify-between py-px"
    :style="backgroundColor ? { backgroundColor } : undefined"
  >
    <div
      class="flex items-center justify-center divide-x text-center"
      :style="textColor ? { color: textColor } : undefined"
    >
      <SFDealTimer
        v-if="countdownEndDate"
        is-slim
        :time-until="countdownEndDate"
        :color-style="{ backgroundColor, color: textColor }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SFDealTimer from './SFDealTimer.vue'

const { backgroundColor, textColor, countdownEndDate } = defineProps<{
  /** Background color for the highlight footer bar. */
  backgroundColor?: string
  /** Text color for the countdown timer inside the footer. */
  textColor?: string
  /**
   * ISO end date the countdown runs down to. When set, the countdown timer
   * renders inside the footer.
   */
  countdownEndDate?: string
}>()
</script>

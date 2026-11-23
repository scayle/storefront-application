<template>
  <Transition
    :enter-active-class="`transition-all`"
    :leave-active-class="`transition-all`"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
    mode="default"
    :duration="duration"
  >
    <slot />
  </Transition>
</template>

<script setup lang="ts">
import type { TransitionDuration } from './duration'

const { duration = 200 } = defineProps<{
  /**
   * Controls the duration of the fade transition in milliseconds. Choose based on the content type and user experience requirements.
   */
  duration?: TransitionDuration
}>()
</script>

<template>
  <Transition
    :enter-from-class="transitionClasses.enterFrom"
    :enter-to-class="transitionClasses.enterTo"
    :leave-from-class="transitionClasses.leaveFrom"
    :leave-to-class="transitionClasses.leaveTo"
    :duration="duration"
    :enter-active-class="`transition-all transition-discrete ease-linear ${transitionClasses.starting}`"
    :leave-active-class="`transition-all transition-discrete ease-linear ${transitionClasses.starting}`"
    mode="default"
  >
    <slot />
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TransitionDuration } from './duration'

const props = withDefaults(
  defineProps<{
    /**
     * Controls the duration of the slide transition in milliseconds. This component defaults to 300ms for a smooth effect.
     */
    duration?: TransitionDuration
    /**
     * The direction from which the element slides in.
     */
    from: 'left' | 'right' | 'top' | 'bottom'
  }>(),
  {
    duration: 200,
  },
)

const transitionClasses = computed(() => {
  switch (props.from) {
    case 'top':
      return {
        enterFrom: '-translate-y-full',
        enterTo: 'translate-y-0',
        leaveFrom: 'translate-y-0',
        leaveTo: '-translate-y-full',
        starting: 'starting:-translate-y-full',
      }
    case 'bottom':
      return {
        enterFrom: 'translate-y-full',
        enterTo: 'translate-y-0',
        leaveFrom: 'translate-y-0',
        leaveTo: 'translate-y-full',
        starting: 'starting:translate-y-full',
      }
    case 'left':
      return {
        enterFrom: '-translate-x-full',
        enterTo: 'translate-x-0',
        leaveFrom: 'translate-x-0',
        leaveTo: '-translate-x-full',
        starting: 'starting:-translate-x-full',
      }
    case 'right':
    default:
      return {
        enterFrom: 'translate-x-full',
        enterTo: 'translate-x-0',
        leaveFrom: 'translate-x-0',
        leaveTo: 'translate-x-full',
        starting: 'starting:translate-x-full',
      }
  }
})
</script>

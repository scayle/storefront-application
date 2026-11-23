<template>
  <SFFadeInTransition>
    <SFHint v-if="message" type="ERROR" tag="span" class="lg:mt-0.5">
      {{ message }}
    </SFHint>
  </SFFadeInTransition>
</template>

<script setup lang="ts">
import SFFadeInTransition from '@client/components/ui/transitions/SFFadeInTransition.vue'
import SFHint from '@client/components/ui/core/SFHint.vue'

defineProps<{
  /** Error message to display. Hidden when null or undefined. */
  message: string | null | undefined
}>()
</script>

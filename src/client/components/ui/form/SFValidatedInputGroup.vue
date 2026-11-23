<template>
  <div class="relative min-h-20 pb-4">
    <slot :is-valid="errors.length === 0" :error-id="errorId" />
    <!--
      `role="status"` is idiomatic for inline form validation: it implies
      `aria-live="polite"` AND `aria-atomic="true"`, so when the error text
      reactively flips from "" to a message (or between messages), AT
      announces the new text as a whole instead of diffing characters.
      Only `errors[0]` is rendered by design — each Regle rule fires its own
      short message; showing all violations at once creates announcement
      fatigue and is verbose for sighted users too.
    -->
    <div
      :id="errorId"
      role="status"
      data-testid="validation-error-text"
      class="mt-1 ml-1 text-start text-sm font-normal text-status-alert"
    >
      <SFFadeInTransition>
        <span v-if="errors.length > 0">{{ errors[0] }}</span>
      </SFFadeInTransition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import SFFadeInTransition from '../transitions/SFFadeInTransition.vue'

const { errors = [] } = defineProps<{
  /** Array of error messages to display. */
  errors?: string[]
}>()

const errorId = `validation-error-${useId()}`
</script>

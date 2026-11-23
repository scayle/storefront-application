<template>
  <li role="presentation" class="flex flex-col">
    <span
      :id="headerId"
      class="px-3 pt-2 pb-1 text-sm font-semibold text-secondary"
    >
      {{ label }}
    </span>
    <ul role="group" :aria-labelledby="headerId" class="flex flex-col gap-1">
      <slot />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

const { label } = defineProps<{
  /** Non-interactive section header rendered above the grouped option items. */
  label: string
}>()

const headerId = computed(() => `dropdown-group-${useId()}`)
</script>

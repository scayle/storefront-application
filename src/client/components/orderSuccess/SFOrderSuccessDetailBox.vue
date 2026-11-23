<template>
  <div
    class="flex flex-col gap-2.5 rounded-lg border border-gray-200 p-5 text-secondary"
  >
    <h2 class="heading-section-3">
      {{ title }}
    </h2>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** Box heading text */
  title: string
}>()
</script>

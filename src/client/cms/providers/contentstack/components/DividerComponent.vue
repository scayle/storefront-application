<template>
  <div v-live-preview:height="contentElement" class="w-full" :class="spacing">
    <hr v-if="shouldShowLine" class="border-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DividerComponent } from '@shared/types/cms/contentstack'

const { contentElement } = defineProps<{
  contentElement: DividerComponent
}>()

/** Maps the Contentstack height field to vertical spacing classes. */
const spacing = computed(() => {
  switch (contentElement.height) {
    case 'medium':
      return 'py-5 lg:py-9'
    case 'large':
      return 'py-9 lg:py-12'
    case 'small':
    default:
      return 'py-3 lg:py-5'
  }
})

/** Determines whether the divider line should be rendered. */
const shouldShowLine = computed(() => contentElement.show_line ?? false)
</script>

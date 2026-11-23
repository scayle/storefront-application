<template>
  <div v-editable="contentElement" class="w-full" :class="spacing">
    <hr v-if="shouldShowLine" class="border-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DividerComponent as DividerComponentType } from '@shared/types/cms/storyblok'

const { contentElement } = defineProps<{
  contentElement: DividerComponentType
}>()

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

const shouldShowLine = computed(() => contentElement.showLine ?? false)
</script>

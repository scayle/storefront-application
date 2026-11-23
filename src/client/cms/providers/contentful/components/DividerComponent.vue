<template>
  <div
    :data-contentful-entry-id="contentElement?.sys?.id"
    data-contentful-field-id="height"
    class="w-full"
    :class="spacing"
  >
    <hr v-if="shouldShowLine" class="border-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TypeDividerComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'

const { contentElement } = defineProps<{
  contentElement: TypeDividerComponentWithoutUnresolvableLinksResponse
}>()

/** Maps the Contentful height field to vertical spacing classes. */
const spacing = computed(() => {
  switch (contentElement.fields?.height) {
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
const shouldShowLine = computed(() => contentElement.fields?.showLine ?? false)
</script>

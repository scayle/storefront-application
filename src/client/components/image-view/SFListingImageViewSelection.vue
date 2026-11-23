<template>
  <!-- With no option, the dropdown would hold the default view alone, which leaves nothing to choose. -->
  <SFImageViewSelection v-if="options.length" :options="options" />
</template>

<script setup lang="ts">
import type { ImageViewOption } from '@shared/types/ImageView'
import SFImageViewSelection from '@client/components/image-view/SFImageViewSelection.vue'

defineProps<{
  /** Image views the shop offers, from the `imageViewOptions` page prop of the product listing or the search results page. */
  options: ImageViewOption[]
}>()
</script>

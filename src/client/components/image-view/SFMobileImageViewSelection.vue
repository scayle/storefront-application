<template>
  <div
    class="flex flex-wrap"
    role="group"
    :aria-label="$t('image_view_selection.label')"
    data-testid="mobile-image-view-wrapper"
  >
    <SFButton
      v-for="item in items"
      :key="item.value ?? ''"
      variant="raw"
      :aria-pressed="item.value === selectedImageType"
      :data-testid="`mobile-image-view-item-${item.value ?? 'default'}`"
      class="mr-2 mb-2 flex h-10 w-fit items-center justify-center rounded-full border-2 border-transparent bg-gray-100! px-4 text-md font-semibold whitespace-pre text-secondary transition-none"
      :class="{
        'border-accent! bg-white text-accent!':
          item.value === selectedImageType,
      }"
      @click="selectImageType(item.value)"
    >
      {{ item.label }}
    </SFButton>
  </div>
</template>

<script setup lang="ts">
import type { ImageViewOption } from '@shared/types/ImageView'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { useImageView } from '@client/composables/useImageView'

const { options } = defineProps<{
  /** Image views the shop offers, in Storefront API order. The default view is added in front. */
  options: ImageViewOption[]
}>()

const { items, selectedImageType, selectImageType } = useImageView(
  () => options,
)
</script>

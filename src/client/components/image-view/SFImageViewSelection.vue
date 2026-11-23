<template>
  <SFDropdown
    id="image-view-selection-dropdown"
    data-testid="image-view-dropdown"
    class="w-full lg:w-50 [&_[role=combobox]_svg]:fill-primary"
    size="sm"
    :items="items"
    :model-value="selectedItem"
    :key-by="(item: ImageViewItem) => item.value ?? ''"
    :aria-label="$t('image_view_selection.label')"
    @select="(item: ImageViewItem) => selectImageType(item.value)"
  >
    <template #default>
      <span
        class="max-w-[80%] overflow-hidden text-md! text-ellipsis text-primary"
      >
        {{ selectedItem.label }}
      </span>
    </template>
    <template
      #item="{ item, selectItem, setActive, index, isSelected, isActive, id }"
    >
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/interactive-supports-focus -- Options are not focusable by design. The combobox trigger keeps DOM focus and the keyboard picks options through `aria-activedescendant` -->
      <li
        :id="id"
        role="option"
        :aria-selected="isSelected"
        :data-testid="`image-view-item-${item.value ?? 'default'}`"
        class="mb-1 cursor-pointer rounded-sm p-2 text-md last-of-type:mb-0"
        :class="{
          'bg-gray-200 font-semibold text-primary': isSelected && !isActive,
          'bg-gray-300 font-semibold text-primary': isActive && isSelected,
          'bg-gray-200': isActive && !isSelected,
          'text-secondary': !isSelected,
        }"
        @click="selectItem(item)"
        @mousemove="setActive(index)"
      >
        <span class="flex w-full items-center justify-between">
          {{ item.label }}
          <IconCheckmarkDefault v-if="isSelected" class="size-3 fill-accent" />
        </span>
      </li>
    </template>
  </SFDropdown>
</template>

<script setup lang="ts">
import type { ImageViewOption } from '@shared/types/ImageView'
import SFDropdown from '@client/components/ui/form/SFDropdown.vue'
import IconCheckmarkDefault from '@assets/icons/checkmark/default.svg'
import { useImageView } from '@client/composables/useImageView'
import type { ImageViewItem } from '@client/composables/useImageView'

const { options } = defineProps<{
  /** Image views the shop offers, in Storefront API order. The default view is added in front. */
  options: ImageViewOption[]
}>()

const { items, selectedItem, selectImageType } = useImageView(() => options)
</script>

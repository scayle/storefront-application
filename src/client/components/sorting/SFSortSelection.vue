<template>
  <SFDropdown
    id="sort-selection-dropdown"
    data-testid="sort-dropdown"
    class="w-full lg:w-50 [&_[role=combobox]_svg]:fill-primary"
    size="sm"
    :items="sortOptions"
    :model-value="selectedOption"
    :key-by="(option: SortOption) => option.key"
    :aria-label="$t('filter_slide_in_content.sorting')"
    @select="(item: SortOption) => applySort(item.key)"
  >
    <template #default>
      <span
        class="max-w-[80%] overflow-hidden text-md! text-ellipsis text-primary"
      >
        {{ selectedSort && getSortOptionLabel(selectedSort, $t) }}
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
        :data-testid="`sort-item-${item.key}`"
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
          {{ getSortOptionLabel(item, $t) }}
          <IconCheckmarkDefault v-if="isSelected" class="size-3 fill-accent" />
        </span>
      </li>
    </template>
  </SFDropdown>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-listing-page
import { computed } from 'vue'
import type { SortOption } from '@scayle/storefront/types'
import SFDropdown from '@client/components/ui/form/SFDropdown.vue'
import IconCheckmarkDefault from '@assets/icons/checkmark/default.svg'
import { useSorting } from '@client/composables/useSorting'
import { getSortOptionLabel } from '@client/utils/sorting'

const { selectedSort, sortOptions } = defineProps<{
  /**
   * The selected sort option
   */
  selectedSort?: SortOption
  /**
   * The available sort options
   */
  sortOptions: SortOption[]
}>()

const selectedOption = computed(
  () =>
    sortOptions.find((option) => option.key === selectedSort?.key) ??
    selectedSort,
)

const { applySort } = useSorting(() => selectedSort)
</script>

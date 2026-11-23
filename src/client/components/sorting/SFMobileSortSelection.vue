<template>
  <div class="flex flex-wrap" data-testid="mobile-sort-wrapper">
    <SFButton
      v-for="sort in sortOptions"
      :key="sort.key"
      variant="raw"
      :aria-pressed="sort.key === selectedSort?.key"
      :data-testid="`mobile-sort-item-${sort.key}`"
      class="mr-2 mb-2 flex h-10 w-fit items-center justify-center rounded-full border-2 border-transparent bg-gray-100! px-4 text-md font-semibold whitespace-pre text-secondary transition-none"
      :class="{
        'border-accent! bg-white text-accent!': sort.key === selectedSort?.key,
      }"
      @click="applySort(sort.key)"
    >
      {{ getSortOptionLabel(sort, $t) }}
    </SFButton>
  </div>
</template>

<script setup lang="ts">
import type { SortOption } from '@scayle/storefront/types'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { useSorting } from '@client/composables/useSorting'
import { getSortOptionLabel } from '@client/utils/sorting'

const { selectedSort } = defineProps<{
  /**
   * The selected sort option
   */
  selectedSort?: SortOption
  /**
   * The available sort options
   */
  sortOptions: SortOption[]
}>()

const { applySort } = useSorting(() => selectedSort)
</script>

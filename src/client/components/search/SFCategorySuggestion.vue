<template>
  <SFSearchResultItem
    :id="`search-result-category-${suggestion.id}`"
    :to="suggestion.link"
    :active-id="activeId"
    :aria-label="accessibleName"
  >
    <div class="space-y-2">
      <div
        v-if="suggestion.breadcrumbs.length"
        class="flex flex-wrap items-center gap-1 text-md text-secondary"
        data-testid="search-suggestion-breadcrumbs"
      >
        <template
          v-for="(crumb, index) in suggestion.breadcrumbs"
          :key="crumb.id ?? crumb.value"
        >
          <span>{{ crumb.value }}</span>
          <IconChevronRight
            v-if="index < suggestion.breadcrumbs.length - 1"
            aria-hidden="true"
            data-testid="search-suggestion-breadcrumb-separator"
            class="size-2 shrink-0 text-secondary"
          />
        </template>
      </div>
      <div class="text-lg font-bold">
        {{ suggestion.name }}
      </div>
      <div
        v-if="filterLabels.length"
        class="flex flex-wrap gap-2"
        data-testid="search-suggestion-tag-group"
      >
        <div
          v-for="(label, index) in filterLabels"
          :key="index"
          class="flex h-5 items-center rounded-md bg-gray-300 p-1 text-sm leading-none text-secondary"
          :data-testid="`search-suggestion-tag-${index}`"
        >
          {{ label }}
        </div>
      </div>
    </div>
  </SFSearchResultItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SearchCategorySuggestion } from '@scayle/storefront/types'
import IconChevronRight from '@assets/icons/navigation/right.svg'
import SFSearchResultItem from './SFSearchResultItem.vue'

const { suggestion } = defineProps<{
  /** Category search suggestion to display. */
  suggestion: SearchCategorySuggestion
  /** Currently active suggestion ID from keyboard navigation. */
  activeId?: string
}>()

const filterLabels = computed(() =>
  suggestion.filters.flatMap((filter) =>
    filter.values.map((value) => `${filter.label}: ${value}`),
  ),
)

const accessibleName = computed(() => {
  const hierarchy = [
    ...suggestion.breadcrumbs.map((c) => c.value),
    suggestion.name,
  ].join(', ')

  const filters = suggestion.filters
    .flatMap((filter) =>
      filter.values.map((value) => `${filter.label}: ${value}`),
    )
    .join('; ')
  return filters ? `${hierarchy}; ${filters}` : hierarchy
})
</script>

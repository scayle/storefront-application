<template>
  <div
    role="dialog"
    class="w-full space-y-5 border-gray-400 bg-white max-lg:min-h-[calc(100dvh-6.75rem)] lg:rounded-lg lg:border lg:p-4 lg:shadow-overlay"
    data-testid="search-results-flyout"
    :aria-label="$t('global.search_results')"
  >
    <div
      v-if="showSuggestionsLoader && resultsCount === 0"
      class="space-y-5"
      data-testid="skeleton"
    >
      <div class="space-y-3">
        <SFSkeletonLoader class="h-3.5" type="headline" />
        <ul class="space-y-2">
          <li v-for="index in SUGGESTION_SKELETON_COUNT" :key="index">
            <SFSkeletonLoader
              class="h-16 rounded-lg"
              type="button"
              full-width
            />
          </li>
        </ul>
      </div>
      <SFSkeletonLoader class="h-11 lg:h-5" type="button" />
    </div>
    <div v-else-if="resultsCount > 0" class="space-y-5 bg-white">
      <SFSuggestionGroup
        v-if="categories.length"
        :title="$t('category_suggestion_list.title')"
        :count="categories.length"
      >
        <li v-for="suggestion in categories" :key="suggestion.id">
          <SFCategorySuggestion
            :suggestion="suggestion"
            :active-id="activeId"
            @click="$emit('clickResult', suggestion)"
          />
        </li>
      </SFSuggestionGroup>
      <SFSuggestionGroup
        v-if="products.length"
        :title="$t('product_suggestion_list.title')"
        :count="products.length"
      >
        <li v-for="suggestion in products" :key="suggestion.product.id">
          <SFProductSuggestion
            :suggestion="suggestion"
            :active-id="activeId"
            @click="$emit('clickResult', suggestion)"
          />
        </li>
      </SFSuggestionGroup>
      <SFSuggestionGroup
        v-if="navigationItems.length"
        :title="$t('navigation_item_suggestion_list.title')"
        :count="navigationItems.length"
      >
        <li v-for="suggestion in navigationItems" :key="suggestion.id">
          <SFNavigationItemSuggestion
            :suggestion="suggestion"
            :search-term="searchQuery"
            :active-id="activeId"
            @click="$emit('clickResult', suggestion)"
          />
        </li>
      </SFSuggestionGroup>
      <SFShowAllResultsLink
        :search-term="searchQuery"
        :to="showAllResultsLink"
        :active-id="activeId"
        @click="$emit('clickResult', 'show_all')"
      />
    </div>
    <section v-else-if="searchQuery" class="py-2" data-testid="no-result">
      <SFShowAllResultsLink
        :search-term="searchQuery"
        :to="showAllResultsLink"
        @click="$emit('clickResult', 'show_all')"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/discovery/search
import { computed } from 'vue'
import type {
  SearchCategorySuggestion,
  SearchProductSuggestion,
  SearchNavigationItemSuggestion,
} from '@scayle/storefront/types'
import type { SearchSuggestion } from '@client/utils/search'
import SFSkeletonLoader from '@client/components/ui/core/SFSkeletonLoader.vue'
import SFSuggestionGroup from './SFSuggestionGroup.vue'
import SFCategorySuggestion from './SFCategorySuggestion.vue'
import SFProductSuggestion from './SFProductSuggestion.vue'
import SFNavigationItemSuggestion from './SFNavigationItemSuggestion.vue'
import SFShowAllResultsLink from './SFShowAllResultsLink.vue'

/** Skeleton row count. Matches typical suggestion payload size for stable flyout height. */
const SUGGESTION_SKELETON_COUNT = 3

const { products, categories, navigationItems } = defineProps<{
  /** Current search query string. */
  searchQuery: string
  /** Product search suggestions. */
  products: SearchProductSuggestion[]
  /** Category search suggestions. */
  categories: SearchCategorySuggestion[]
  /** Navigation item search suggestions. */
  navigationItems: SearchNavigationItemSuggestion[]
  /** Whether to show the loading skeleton. */
  showSuggestionsLoader: boolean
  /** Server-generated link to the search results page. */
  showAllResultsLink: string
  /** Currently active suggestion ID from keyboard navigation. */
  activeId?: string
}>()

defineEmits<{
  clickResult: [result: SearchSuggestion | 'show_all']
}>()

const resultsCount = computed(() => {
  return products.length + navigationItems.length + categories.length
})
</script>

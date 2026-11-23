<!-- eslint-disable vue/no-v-html -- `highlightSearchTerm` HTML-escapes every segment and only adds its own fixed `<span>` wrapper -->
<template>
  <SFSearchResultItem
    :id="`search-result-nav-${suggestion.id}`"
    :to="suggestion.link"
    :active-id="activeId"
  >
    <div class="text-secondary" v-html="title" />
  </SFSearchResultItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SearchNavigationItemSuggestion } from '@scayle/storefront/types'
import { highlightSearchTerm } from '@client/utils/highlightSearchTerm'
import SFSearchResultItem from './SFSearchResultItem.vue'

const { suggestion, searchTerm = '' } = defineProps<{
  /** Navigation item search suggestion to display. */
  suggestion: SearchNavigationItemSuggestion
  /** Current search term used for highlighting matches. */
  searchTerm?: string
  /** Currently active suggestion ID from keyboard navigation. */
  activeId?: string
}>()

const title = computed(() => highlightSearchTerm(suggestion.name, searchTerm))
</script>

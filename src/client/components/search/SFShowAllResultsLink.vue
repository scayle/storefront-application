<!-- eslint-disable vue/no-v-html -- `highlightSearchTerm` HTML-escapes the whole label and only adds its own fixed `<span>` wrapper -->
<template>
  <SFLink
    :id="SHOW_ALL_RESULTS_ID"
    data-testid="display-all-results"
    :to="to"
    tabindex="-1"
    :data-selected="isActive || undefined"
    raw
    class="flex! h-7 max-w-fit rounded-sm p-1 transition-all hover:bg-gray-200 focus:bg-gray-200 data-selected:bg-gray-200"
  >
    <span class="truncate body-default lg:text-lg" v-html="showMoreLabel" />
  </SFLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { highlightSearchTerm } from '@client/utils/highlightSearchTerm'
import { SHOW_ALL_RESULTS_ID } from '@client/composables/useSearchSuggestionNavigation'
import SFLink from '@client/components/ui/links/SFLink.vue'

const { searchTerm, to, activeId } = defineProps<{
  /** Current search term for display/highlighting. */
  searchTerm: string
  /** Server-generated link to the search results page. */
  to: string
  /** Currently active suggestion ID from keyboard navigation. */
  activeId?: string
}>()

const { t } = useI18n()
const isActive = computed(() => SHOW_ALL_RESULTS_ID === activeId)

const translatedLabel = computed(() =>
  t('show_all_results_link.open_on_search_page', { searchTerm }),
)

const showMoreLabel = computed(() =>
  highlightSearchTerm(translatedLabel.value, searchTerm),
)
</script>

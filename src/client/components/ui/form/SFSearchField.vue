<template>
  <div
    ref="root"
    class="group/search relative transition-all duration-150 max-lg:flex max-lg:px-3 lg:max-w-64 lg:focus-within:max-w-[475px]"
    @focusout="onFocusOut"
  >
    <form
      class="w-full"
      role="search"
      data-testid="search-form"
      @submit.prevent="goToSearchResolutionOrSearchPage"
      @reset.prevent="reset"
    >
      <!-- A label, so a click on the icon or the padding focuses the input. -->
      <label
        class="flex h-11 items-center gap-2 overflow-hidden rounded-md border border-gray-200 bg-gray-200 px-3 pr-8 transition-all duration-150 group-focus-within/search:bg-white group-focus-within/search:pr-3 focus-within:focus-style hover:bg-gray-300 group-focus-within/search:hover:bg-white max-lg:grow lg:h-10 lg:group-focus-within/search:rounded-md"
      >
        <IconUtilitySearch
          class="size-4 shrink-0 fill-secondary"
          aria-hidden="true"
        />
        <input
          :id="inputId ?? `${popoverId}-input`"
          ref="inputEl"
          v-model.trim="searchQuery"
          type="search"
          role="combobox"
          autocomplete="off"
          aria-haspopup="dialog"
          :aria-controls="showResults ? popoverId : undefined"
          :aria-expanded="showResults"
          aria-autocomplete="list"
          :aria-activedescendant="activeId"
          :placeholder="$t('search_input.placeholder')"
          :aria-label="$t('global.search')"
          class="min-w-0 grow appearance-none bg-gray-200 transition-colors group-focus-within/search:bg-white placeholder:text-gray-500 placeholder-shown:truncate focus-visible:shadow-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          :class="{
            'group-hover/search:bg-gray-300': !hasFocus,
          }"
          data-testid="header-search-input"
          @focus="hasFocus = true"
          @keydown="onKeydown"
          @input="onInput"
        />
        <div
          v-show="searchQuery"
          class="hidden group-focus-within/search:contents"
        >
          <SFButton
            type="reset"
            variant="plain"
            class="shrink-0 text-md! ring-0 transition duration-150"
            data-testid="search-reset-button"
          >
            {{ $t('global.clear') }}
          </SFButton>
        </div>
      </label>
    </form>
    <div class="sr-only" aria-live="polite" role="status">
      {{ announcement }}
    </div>
    <div
      v-if="showResults"
      :id="popoverId"
      class="absolute top-full z-20 mt-4 max-lg:inset-x-3 max-lg:w-auto lg:mt-2 lg:w-full"
      @pointerdown.prevent
    >
      <SFSearchResultsContainer
        :products="products"
        :categories="categories"
        :navigation-items="navigationItems"
        :search-query="searchQuery"
        :show-suggestions-loader="showSuggestionsLoader"
        :show-all-results-link="showAllResultsLink"
        :active-id="activeId"
        @click-result="onClickResult"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { onClickOutside, useDebounceFn, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useSearch } from '@client/composables/useSearch'
import { useSearchSuggestionNavigation } from '@client/composables/useSearchSuggestionNavigation'
import { useKeydownActions } from '@client/composables/useKeydownActions'
import { useSearchEvents } from '@client/composables/tracking/useSearchEvents'
import type { SearchSuggestion } from '@client/utils/search'
import type { GroupedSearchSuggestions } from '@scayle/storefront/types'
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconUtilitySearch from '@assets/icons/utility/search.svg'
import { useRoute } from '@client/composables/useRoute'
import SFSearchResultsContainer from '@client/components/search/SFSearchResultsContainer.vue'

const DEBOUNCED_SEARCH_DURATION = 300

const {
  searchQuery,
  getSearchSuggestions,
  resetSearch: resetSearchState,
  suggestions,
  products,
  categories,
  navigationItems,
  showAllResultsLink,
  hasSuggestions,
  status,
  resolveSearch,
} = useSearch()

const {
  trackSearchOutcome,
  trackViewSearchSuggestions,
  trackSelectSearchSuggestion,
} = useSearchEvents()

const debouncedSearch = useDebounceFn(
  getSearchSuggestions,
  DEBOUNCED_SEARCH_DURATION,
)

// `suggestionEntries` is the dropdown order keyboard navigation walks; the
// SCAYLE Analytics suggestion events take `position` and `total` from it, and
// `activeSuggestion` is one of its elements.
const {
  entries: suggestionEntries,
  activeId,
  activeLink,
  activeSuggestion,
  next,
  prev,
  resetNavigation,
} = useSearchSuggestionNavigation(
  categories,
  products,
  navigationItems,
  showAllResultsLink,
)

const { navigate } = useRoute()

const showSuggestionsLoader = computed(() => {
  return (
    status.value === 'pending' && (!searchQuery.value || !hasSuggestions.value)
  )
})

const { t } = useI18n()
const { inputId } = defineProps<{
  /**
   * Stable id for the search input, used as a skip-link target. Falls back to a
   * generated id when omitted.
   */
  inputId?: string
}>()

const popoverId = `search-${useId().replace(/:/g, '')}`
const root = ref<HTMLElement>()
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
const hasFocus = ref(false)
const redirectAnnouncement = ref('')

const totalCount = computed(() => suggestionEntries.value.length)

const suggestionsAnnouncement = computed(() => {
  if (status.value === 'pending') {
    return t('global.search_results_loading')
  }
  if (status.value === 'success' && totalCount.value === 0) {
    return t('global.search_no_results')
  }
  if (status.value === 'success') {
    return t('global.search_results_count', { count: totalCount.value })
  }
  return ''
})

const announcement = computed(
  () => redirectAnnouncement.value || suggestionsAnnouncement.value,
)

const showResults = computed(
  () => searchQuery.value.length >= 3 && hasFocus.value,
)

// One `view_search_suggestion` per row when the dropdown renders a suggestions
// result it has not reported yet: when it opens on a fresh result, and when a
// new `getSearchSuggestions` result replaces the rows while it is open.
// Re-opening on the result already reported (blur, then refocus) repeats
// nothing. Nothing fires while the dropdown is hidden, for an empty result, or
// for the loader, which keeps the previous `suggestions` object until the new
// one lands.
let reportedSuggestions: GroupedSearchSuggestions | undefined
watch(
  () => (showResults.value ? suggestions.value : undefined),
  (grouped) => {
    if (
      !grouped ||
      grouped === reportedSuggestions ||
      !suggestionEntries.value.length
    ) {
      return
    }
    reportedSuggestions = grouped
    trackViewSearchSuggestions(suggestionEntries.value, searchQuery.value)
  },
)

// A blur only dismisses the suggestions when focus lands on a real element
// outside the field. A blur to `<body>` is iOS Safari dismissing the on-screen
// keyboard — the user is still reading the suggestions, so keep them open.
const focusLeftField = (target: Element | null) =>
  Boolean(target) && target !== document.body && !root.value?.contains(target)

// Defer the hide check to the next macrotask. `nextTick` runs as a microtask
// and fires before the pending pointer-up / click on a suggestion link
const { start: scheduleHideCheck } = useTimeoutFn(
  () => {
    if (focusLeftField(document.activeElement)) {
      resetNavigation()
      hasFocus.value = false
    }
  },
  0,
  { immediate: false },
)

const onFocusOut = () => {
  scheduleHideCheck()
}

onClickOutside(root, () => {
  resetNavigation()
  hasFocus.value = false
})

const reset = () => {
  resetSearchState()
  resetNavigation()
  redirectAnnouncement.value = ''
  hasFocus.value = false
}

const finishNavigation = () => {
  inputEl.value?.blur()
  reset()
}

// The results container emits the clicked suggestion object or `'show_all'`.
// The entry is found by identity in the list keyboard navigation walks, so
// position and type match the dropdown. "Show all" is not a suggestion.
const onClickResult = (result: SearchSuggestion | 'show_all'): void => {
  const entry = suggestionEntries.value.find(({ item }) => item === result)
  if (entry) {
    trackSelectSearchSuggestion(
      entry,
      suggestionEntries.value,
      searchQuery.value,
    )
  }
  finishNavigation()
}

const onInput = () => {
  hasFocus.value = true
  resetNavigation()
  debouncedSearch()
}

const goToSearchResolutionOrSearchPage = async () => {
  if (!searchQuery.value) {
    return
  }

  redirectAnnouncement.value = t('global.search_redirecting')

  const resolved = await resolveSearch()
  if (resolved?.link) {
    // The resolved entity is the outcome of this search. An unresolved term
    // lands on the search results page, which reports the `term` outcome.
    trackSearchOutcome(searchQuery.value, resolved)
    navigate(resolved.link)
    finishNavigation()
    return
  }

  navigate(showAllResultsLink.value)
  finishNavigation()
}

const navigateToActiveOrSubmit = (event: KeyboardEvent) => {
  if (activeLink.value) {
    event.preventDefault()
    if (activeSuggestion.value) {
      trackSelectSearchSuggestion(
        activeSuggestion.value,
        suggestionEntries.value,
        searchQuery.value,
      )
    }
    redirectAnnouncement.value = t('global.search_redirecting')
    navigate(activeLink.value)
    finishNavigation()
  }
}

// APG combobox Escape is two-step: an open listbox is dismissed first (the
// query is kept), and only a second Escape on the closed listbox clears the
// textbox — so a stray Escape never destroys what the user typed.
const handleEscape = (event: KeyboardEvent) => {
  event.preventDefault()
  if (showResults.value) {
    hasFocus.value = false
    resetNavigation()
    return
  }
  reset()
}

// `preventDefault: false` because `enter` is conditional: it only blocks the
// default when an active suggestion is selected, otherwise the keypress must
// submit the form (redirect to the search page). Each action prevents as needed.
const onKeydown = useKeydownActions(
  {
    enter: navigateToActiveOrSubmit,
    escape: handleEscape,
    down: (event) => {
      event.preventDefault()
      next()
    },
    up: (event) => {
      event.preventDefault()
      prev()
    },
  },
  { preventDefault: false },
)
</script>

<template>
  <PageMetaHead :meta="meta" :json-ld="jsonLd" />
  <div class="flex flex-col">
    <div class="relative container flex bg-white pt-4">
      <div class="w-full grow">
        <div class="flex flex-wrap items-center justify-between gap-5">
          <div class="flex items-baseline gap-1">
            <h1
              class="line-clamp-2 heading-section-1 wrap-anywhere max-sm:leading-6"
              data-testid="search-results-headline"
            >
              {{ $t('search_page.title', { term }) }}
            </h1>
            <SFHeadlineItemCount
              v-if="!termRejected"
              :count="pagination.totalItems"
            />
          </div>
          <div v-if="showControls" class="flex gap-4 max-lg:hidden">
            <SFListingImageViewSelection :options="imageViewOptions" />
            <SFFilterToggleButton
              :label="$t('filter.show_filter')"
              :applied-filters-count="appliedFilters.count"
              v-bind="filterTriggerAttrs"
              @toggle="toggleFilter"
            />
          </div>
        </div>

        <SFFilterToggleButton
          v-if="showControls"
          class="mt-4 lg:hidden"
          :label="$t('filter.show_filter')"
          :applied-filters-count="appliedFilters.count"
          v-bind="filterTriggerAttrs"
          @toggle="toggleFilter"
        />

        <div
          v-if="termRejected"
          class="mt-6 rounded-xl border border-gray-300 p-8"
          data-testid="search-term-rejected"
        >
          <p class="body-default">{{ $t('search_page.term_too_long') }}</p>
        </div>
        <SFProductGrid
          v-else
          class="mt-6"
          :products="products"
          :pagination="pagination"
          :applied-filters="appliedFilters"
          product-list-type="search_results"
          :product-list-id="productListId"
          :image-type="selectedImageType"
        >
          <template #no-results>
            <SFSearchNoResults
              :applied-filters="appliedFilters"
              :product-list-id="productListId"
            />
          </template>
        </SFProductGrid>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/discovery/search
import { computed, onMounted, reactive } from 'vue'
import { useRemember } from '@inertiajs/vue3'
import type {
  ListingProduct,
  Pagination,
  Filter,
  AppliedFilters,
} from '@scayle/storefront/types'
import type { SearchPageJsonLd, SEOMeta } from '@shared/types/SEO'
import SFProductGrid from '@client/components/product/SFProductGrid.vue'
import SFSearchNoResults from '@client/components/product/SFSearchNoResults.vue'
import SFFilterToggleButton from '@client/components/filter/SFFilterToggleButton.vue'
import { useOverlay } from '@client/composables/useOverlay'
import SFHeadlineItemCount from '@client/components/ui/core/SFHeadlineItemCount.vue'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import SFListingImageViewSelection from '@client/components/image-view/SFListingImageViewSelection.vue'
import { useImageView } from '@client/composables/useImageView'
import type { ImageViewOption } from '@shared/types/ImageView'
import { useSearchEvents } from '@client/composables/tracking/useSearchEvents'
import { buildSearchRoute } from '@shared/routes'

const props = defineProps<{
  /** The search term being displayed. */
  term: string
  /** Result products, resolved during SSR. */
  products: ListingProduct[]
  /** Pagination for the results. */
  pagination: Pagination
  /** SEO meta data (noindex, nofollow). */
  meta: SEOMeta
  /** ItemList of the result products. Server-only: present on the server-rendered page, absent after a client-side navigation. */
  jsonLd?: SearchPageJsonLd
  /** Current applied filters parsed from query params. */
  appliedFilters: AppliedFilters
  /** Available filter options, deferred from the server. */
  filters?: Filter[]
  /** Image views the shop offers. Empty when it offers none, which hides the selector. */
  imageViewOptions: ImageViewOption[]
  /** Whether the search provider rejects the term as too long, so no search ran and the page shows a hint instead of results. */
  termRejected: boolean
}>()

const { trackSearchOutcome } = useSearchEvents()

// The term is free text typed by the user, so it is trimmed; the grid and
// `apply_filter` share this id.
const productListId = computed(() => props.term.trim())

const { triggerAttrs: filterTriggerAttrs, toggle: toggleFilter } =
  useOverlay().create(
    () => import('@client/components/filter/SFFilterSlideIn.vue'),
    {
      props: () => ({
        hideSorting: true,
        imageViewOptions: props.imageViewOptions,
        appliedFilter: props.appliedFilters,
        filters: props.filters,
        filteredProductCount: props.pagination.totalItems,
        productListType: 'search_results' as const,
        productListId: productListId.value,
      }),
    },
  )

const showControls = computed(() => props.products.length > 0)

const { selectedImageType } = useImageView(() => props.imageViewOptions)

// Kept in the history state, so browser back to these results restores the
// flag and the search is not resubmitted, while a new visit starts fresh.
const searchOutcome = useRemember(
  reactive({ tracked: false }),
  'search-outcome',
) as { tracked: boolean }

onMounted(() => {
  // The `search` events record the outcome of the submitted search once.
  // Pagination and filter reloads do not resubmit a search, and neither does
  // returning to the results via browser history. `trackSearchOutcome` adds
  // the country prefix to the results route, as it does for a resolve outcome
  // and `suggestion_url`. A rejected term was never searched, so reporting it
  // as a zero-result search would skew those reports.
  if (searchOutcome.tracked || props.termRejected) {
    return
  }
  searchOutcome.tracked = true
  trackSearchOutcome(props.term, {
    type: 'term',
    link: buildSearchRoute(props.term),
    resultCount: props.pagination.totalItems,
  })
})
</script>

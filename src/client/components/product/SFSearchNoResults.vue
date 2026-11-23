<template>
  <div
    class="flex w-full flex-col items-start rounded-xl border border-gray-300 p-8"
    data-testid="search-no-results"
  >
    <h2 class="mb-4 heading-section-2">
      {{ $t('search_page.no_results.title') }}
    </h2>
    <p class="mb-10 body-default-secondary">
      {{ $t('search_page.no_results.tip') }}
    </p>
    <div
      class="flex flex-wrap items-center justify-start gap-4 max-sm:w-full max-sm:flex-col"
    >
      <SFButton
        variant="primary"
        :to="routes.home"
        class="max-sm:w-full"
        data-testid="search-no-results-home"
      >
        {{ $t('common.continue_shopping') }}
      </SFButton>
      <SFButton
        v-if="appliedFilters.count > 0"
        type="button"
        variant="secondary"
        class="max-sm:w-full"
        data-testid="search-reset-filters-button"
        @click="resetAllFilters"
      >
        {{ $t('product_list_no_results.reset_filters') }}
      </SFButton>
    </div>
    <div
      v-if="categoryLinks.length"
      class="mt-10 w-full"
      role="group"
      :aria-labelledby="categoriesLabelId"
      data-testid="search-no-results-categories"
    >
      <p :id="categoriesLabelId" class="mb-4 body-default">
        {{ $t('category_suggestion_list.title') }}
      </p>
      <div class="flex flex-wrap gap-4 max-sm:flex-col">
        <SFButton
          v-for="item in categoryLinks"
          :key="item.id"
          variant="secondary"
          :to="item.href"
          :target="item.openInNewWindow ? '_blank' : '_self'"
          class="max-sm:w-full"
          data-testid="search-no-results-category"
        >
          {{ item.name }}
        </SFButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AppliedFilters } from '@scayle/storefront/types'
import { computed, useId } from 'vue'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { useFilter } from '@client/composables/useFilter'
import { usePage } from '@client/composables/usePage'
import { routes } from '@shared/routes'

const { appliedFilters, productListId } = defineProps<{
  /** Applied filters of the search. "Reset filters" shows when at least one is applied. */
  appliedFilters: AppliedFilters
  /** Search term, the SCAYLE Analytics `product_list_id` of the `apply_filter` the reset reports. */
  productListId: string
}>()

const { resetAllFilters } = useFilter(
  () => appliedFilters,
  () => ({
    product_list_type: 'search_results',
    product_list_id: productListId,
  }),
)

const page = usePage()
const categoriesLabelId = useId()

// A disabled or link-less item renders as plain text in the header's
// `SFNavigationTreeItem`. `'#'` is the navigation mapper's stand-in for a `page`
// target or a category the shop doesn't show. The header still opens its
// flyout, but here it would be a button that goes nowhere.
const categoryLinks = computed(() =>
  page.props.navigation.filter(
    (item) => item.href && item.href !== '#' && !item.disabled,
  ),
)
</script>

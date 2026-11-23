<template>
  <SFSlideIn
    v-model:is-open="open"
    :label="$t('filter_header.title')"
    :close-on-route-change="false"
    data-testid="filter-slide-in"
    @open="onSlideInOpen"
    @close="onSlideInClose"
  >
    <!--
      The `<form>` lets keyboard users hit Enter from any control to submit the
      filter panel. The `id` is shared with the Apply button in the footer via
      its `form` attribute so the button can stay in the slide-in's footer slot
      and still submit this form.
    -->
    <form :id="formId" @submit.prevent="onApply">
      <SFFilterSlideInContent
        :key="contentKey"
        :hide-sorting="hideSorting"
        :applied-filter="appliedFilter"
        :selected-sort="selectedSort"
        :sort-options="sortOptions"
        :image-view-options="imageViewOptions"
        :filters="filters"
        @apply-attribute-filter="applyAttributeFilter"
        @apply-boolean-filter="applyBooleanFilter"
        @handle-apply-or-reset-price-filter-emit="
          handleApplyOrResetPriceFilterEmit
        "
        @handle-apply-or-reset-reduction-filter-emit="
          handleApplyOrResetReductionFilterEmit
        "
        @reset-price-filter="resetPriceFilter"
        @reset-reduction-filter="resetReductionFilter"
        @reset-attribute-filter="resetAttributeFilter"
      />
    </form>
    <template #footer>
      <SFFilterActions
        class="w-full"
        :filtered-product-count="filteredProductCount"
        :form-id="formId"
        @reset="resetAllFilters"
      />
    </template>
  </SFSlideIn>
</template>

<script setup lang="ts">
// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-listing-page
import { ref, useId } from 'vue'
import SFSlideIn from '@client/components/ui/core/SFSlideIn.vue'
import type {
  SortOption,
  AppliedFilters,
  Filter,
} from '@scayle/storefront/types'
import type { AnalyticsProductListType } from '@scayle/storefront-api'
import type { ImageViewOption } from '@shared/types/ImageView'
import { useFilter } from '@client/composables/useFilter'
import { useRouterEvent } from '@client/composables/useRouterEvent'
import SFFilterSlideInContent from './SFFilterSlideInContent.vue'
import SFFilterActions from './SFFilterActions.vue'

const {
  hideSorting = false,
  selectedSort = undefined,
  sortOptions = [],
  imageViewOptions = [],
  filteredProductCount = 0,
  appliedFilter,
  productListType,
  productListId,
} = defineProps<{
  /**
   * Whether to hide the sorting section in the filter panel (Only used for mobile).
   */
  hideSorting?: boolean
  /**
   * The currently selected sort option.
   */
  selectedSort?: SortOption
  /**
   * The available sort options. Labels resolve client-side from the key.
   */
  sortOptions?: SortOption[]
  /**
   * Image views the shop offers, for the mobile image view group (only used for mobile).
   */
  imageViewOptions?: ImageViewOption[]
  /**
   * The applied filter
   */
  appliedFilter: AppliedFilters
  /**
   * The available filters
   */
  filters?: Filter[]
  /**
   * The filtered product count
   */
  filteredProductCount?: number
  /** SCAYLE Analytics surface of the grid the filters apply to, for `apply_filter`. */
  productListType: AnalyticsProductListType
  /** SCAYLE Analytics identifier within the surface: category id or search term. */
  productListId?: string
}>()

/** Controls whether the filter slide-in panel is open. Use `v-model:open` to bind. */
const open = defineModel<boolean>('open', {
  required: true,
  default: false,
})

const {
  resetAllFilters,
  onSlideInOpen,
  onSlideInClose,
  applyAttributeFilter,
  applyBooleanFilter,
  handleApplyOrResetPriceFilterEmit,
  handleApplyOrResetReductionFilterEmit,
  resetPriceFilter,
  resetReductionFilter,
  resetAttributeFilter,
} = useFilter(
  () => appliedFilter,
  () => ({
    product_list_type: productListType,
    product_list_id: productListId,
  }),
)

// A failed reload keeps the page and its props, while a clicked checkbox,
// chip, or radio keeps the checked state it toggled to. Remounting the content
// puts every control back on the applied filters and sort.
const contentKey = ref(0)
const remountContent = () => {
  contentKey.value++
}
useRouterEvent('httpException', remountContent)
useRouterEvent('networkError', remountContent)

// `formId` links the body `<form>` and the apply button in the footer so
// `Enter` from any control submits the panel even though the button sits in
// the slide-in's `#footer` slot.
const formId = `filter-slide-in-form-${useId().replace(/:/g, '')}`

const onApply = () => {
  open.value = false
}
</script>

<template>
  <div
    class="flex w-full flex-col items-start rounded-xl border border-gray-300 p-8"
    data-testid="plp-no-results"
  >
    <h2 class="mb-4 heading-section-2">
      {{ $t('product_list_no_results.title') }}
    </h2>
    <p class="mb-10 body-default-secondary">
      {{ $t('product_list_no_results.description') }}
    </p>
    <div
      class="flex flex-wrap items-center justify-start gap-4 max-sm:flex-col"
    >
      <SFButton
        v-if="category"
        variant="primary"
        :to="category.link"
        class="max-sm:w-full"
      >
        <template #prepend-icon>
          <IconNavigationLeft />
        </template>
        {{
          $t('product_list_no_results.back_to_category', {
            category: category.name,
          })
        }}
      </SFButton>
      <SFButton
        v-if="areFiltersApplied"
        type="button"
        variant="secondary"
        size="md"
        class="max-sm:w-full"
        data-testid="plp-reset-filters-button"
        @click="resetAllFilters"
      >
        {{ $t('product_list_no_results.reset_filters') }}
      </SFButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Category, AppliedFilters } from '@scayle/storefront/types'
import type { AnalyticsProductListType } from '@scayle/storefront-api'
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconNavigationLeft from '@assets/icons/navigation/left.svg'
import { useFilter } from '@client/composables/useFilter'
import { computed } from 'vue'

const { category, appliedFilters, productListType, productListId } =
  defineProps<{
    category?: Category
    appliedFilters: AppliedFilters
    /** SCAYLE Analytics surface of the grid, for the `apply_filter` the reset reports. */
    productListType: AnalyticsProductListType
    /** SCAYLE Analytics identifier within the surface: category id or search term. */
    productListId?: string
  }>()

const { resetAllFilters } = useFilter(
  () => appliedFilters,
  () => ({
    product_list_type: productListType,
    product_list_id: productListId,
  }),
)

const areFiltersApplied = computed(() => appliedFilters.count > 0)
</script>

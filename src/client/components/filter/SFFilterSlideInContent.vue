<template>
  <SFFilterGroup
    v-if="!hideSorting"
    class="lg:hidden"
    :label="$t('filter_slide_in_content.sorting')"
  >
    <SFMobileSortSelection
      :selected-sort="selectedSort"
      :sort-options="sortOptions"
    />
  </SFFilterGroup>
  <SFFilterGroup
    v-if="imageViewOptions.length"
    class="lg:hidden"
    :label="$t('image_view_selection.label')"
  >
    <SFMobileImageViewSelection :options="imageViewOptions" />
  </SFFilterGroup>
  <template v-for="(filter, index) in filters" :key="filter.slug">
    <template v-if="filter.type === 'range' && filter.min !== filter.max">
      <SFFilterGroup
        v-if="filter.slug === 'prices'"
        :label="filter.name"
        :show-action="
          !!(appliedFilter.price?.max || appliedFilter.price?.min) &&
          (appliedFilter.price?.min !== filter.min ||
            appliedFilter.price?.max !== filter.max)
        "
        :class="{ 'border-t border-t-gray-300': index !== 0 }"
        @click-reset="emit('resetPriceFilter')"
      >
        <SFFilterRangeSlider
          :model-value="getPriceRange(appliedFilter, filter.min, filter.max)"
          :filter-slug="filter.slug"
          class="mt-10"
          :max="filter.max"
          :min="filter.min"
          @dragend="
            emit(
              'handleApplyOrResetPriceFilterEmit',
              $event,
              filter.min,
              filter.max,
            )
          "
          @input-field-update="
            emit(
              'handleApplyOrResetPriceFilterEmit',
              $event,
              filter.min,
              filter.max,
            )
          "
          @click="
            emit(
              'handleApplyOrResetPriceFilterEmit',
              $event,
              filter.min,
              filter.max,
            )
          "
        />
      </SFFilterGroup>
      <SFFilterGroup
        v-if="filter.slug === 'max_savings_percentage'"
        :label="filter.name"
        :show-action="
          !!(appliedFilter.reduction?.max || appliedFilter.reduction?.min) &&
          (appliedFilter.reduction?.min !== filter.min ||
            appliedFilter.reduction?.max !== filter.max)
        "
        :class="{ 'border-t border-t-gray-300': index !== 0 }"
        @click-reset="emit('resetReductionFilter')"
      >
        <SFFilterRangeSlider
          :model-value="
            getReductionRange(appliedFilter, filter.min, filter.max)
          "
          :filter-slug="filter.slug"
          class="mt-10"
          :max="filter.max"
          :min="filter.min"
          @dragend="
            emit(
              'handleApplyOrResetReductionFilterEmit',
              $event,
              filter.min,
              filter.max,
            )
          "
          @input-field-update="
            emit(
              'handleApplyOrResetReductionFilterEmit',
              $event,
              filter.min,
              filter.max,
            )
          "
          @click="
            emit(
              'handleApplyOrResetReductionFilterEmit',
              $event,
              filter.min,
              filter.max,
            )
          "
        />
      </SFFilterGroup>
    </template>
    <SFFilterGroup
      v-if="filter.type === 'boolean'"
      :class="{ 'border-t border-t-gray-300': index !== 0 }"
    >
      <SFSwitch
        :id="filter.slug"
        :model-value="appliedFilter.booleans[filter.slug]"
        :label="getBooleanFilterLabel(filter)"
        @update:model-value="emit('applyBooleanFilter', filter.slug)"
      />
    </SFFilterGroup>
    <template v-if="filter.type === 'attributes'">
      <SFFilterGroup
        v-if="filter.slug === 'color'"
        :badge="appliedFilter.attributes[filter.slug]?.length"
        :label="filter.name"
        :class="{ 'border-t border-t-gray-300': index !== 0 }"
        class="pb-9 lg:pb-9"
        @click-reset="emit('resetAttributeFilter', filter.slug)"
      >
        <div class="flex flex-wrap gap-y-4">
          <template v-for="item in filter.values" :key="item.id">
            <SFColorSwatch
              v-if="item.value"
              :id="`filter-color-${item.id}`"
              v-bind="colorSwatchProps(item)"
              :label="item.name"
              :is-checked="
                appliedFilter.attributes[filter.slug]?.includes(item.id)
              "
              :data-color-id="item.id"
              test-id="filter-color-chip"
              @change="emit('applyAttributeFilter', filter.slug, item.id)"
            />
          </template>
        </div>
      </SFFilterGroup>
      <SFFilterGroup
        v-else-if="filter.slug === 'size'"
        :badge="appliedFilter.attributes[filter.slug]?.length"
        :label="filter.name"
        :class="{ 'border-t border-t-gray-300': index !== 0 }"
        @click-reset="emit('resetAttributeFilter', filter.slug)"
      >
        <SFChipGroup selection-mode="multi" :aria-label="filter.name">
          <SFChip
            v-for="item in filter.values"
            :key="item.id"
            :variant="ChipVariant.MULTI_SELECT"
            :model-value="appliedFilter.attributes[filter.slug]"
            :item="item.id"
            :input-aria-label="item.name"
            @change="emit('applyAttributeFilter', filter.slug, item.id)"
          >
            {{ item.name }}
          </SFChip>
        </SFChipGroup>
      </SFFilterGroup>
      <SFFilterGroup
        v-else
        :badge="appliedFilter.attributes[filter.slug]?.length"
        :label="filter.name"
        :class="{ 'border-t border-t-gray-300': index !== 0 }"
        @click-reset="emit('resetAttributeFilter', filter.slug)"
      >
        <div class="flex flex-col gap-3">
          <SFCheckbox
            v-for="item in filter.values"
            :id="item.name"
            :key="item.id"
            :model-value="appliedFilter.attributes[filter.slug]"
            :item="item.id"
            :label="item.name"
            @change="emit('applyAttributeFilter', filter.slug, item.id)"
          />
        </div>
      </SFFilterGroup>
    </template>
  </template>
</template>

<script setup lang="ts">
import SFMobileSortSelection from '@client/components/sorting/SFMobileSortSelection.vue'
import SFCheckbox from '@client/components/ui/form/SFCheckbox.vue'
import SFColorSwatch from '@client/components/ui/form/SFColorSwatch.vue'
import SFSwitch from '@client/components/ui/form/SFSwitch.vue'
import SFChip from '@client/components/ui/core/SFChip.vue'
import SFChipGroup from '@client/components/ui/core/SFChipGroup.vue'
import SFFilterRangeSlider from '@client/components/filter/SFFilterRangeSlider.vue'
import { FILTER_COLORS } from '@client/constants'
import { ChipVariant } from '@client/utils/constants'
import { useI18n } from 'vue-i18n'
import type {
  RangeTuple,
  AppliedFilters,
  SortOption,
  AttributeFilterValue,
  Filter,
  BooleanFilter,
} from '@scayle/storefront/types'
import { getPriceRange, getReductionRange } from '@scayle/storefront/shared'
import { useAttrs } from 'vue'
import SFMobileImageViewSelection from '@client/components/image-view/SFMobileImageViewSelection.vue'
import type { ImageViewOption } from '@shared/types/ImageView'
import SFFilterGroup from './SFFilterGroup.vue'

/**
 * Multi-root template (optional sorting and image view `SFFilterGroup`s
 * followed by a `v-for` of filter-group branches). The leading roots are
 * conditional and the rest is a list, so there is no single root to bind to;
 * fallthrough attributes are consumed via `useAttrs` and deliberately not
 * rendered.
 */
defineOptions({ inheritAttrs: false })
useAttrs()

const {
  appliedFilter,
  filters = [],
  imageViewOptions = [],
} = defineProps<{
  /**
   * The available filters
   */
  filters?: Filter[]
  /**
   * The applied filter
   */
  appliedFilter: AppliedFilters
  /**
   * Whether to hide the sorting section
   */
  hideSorting: boolean
  /**
   * The selected sort option
   */
  selectedSort?: SortOption
  /**
   * The available sort options
   */
  sortOptions: SortOption[]
  /**
   * Image views the shop offers, rendered as a mobile-only group below sorting.
   * The group is absent when the list is empty.
   */
  imageViewOptions?: ImageViewOption[]
}>()

const { t: $t } = useI18n()

const emit = defineEmits<{
  /** Emitted when the user selects or deselects an attribute filter value (e.g. color, size). */
  applyAttributeFilter: [slug: string, id: string]
  /** Emitted when the user toggles a boolean filter (e.g. sale-only toggle). */
  applyBooleanFilter: [slug: string]
  /**
   * Emitted when the price range changes via slider drag, click, or input field.
   * The parent is responsible for applying or resetting the filter based on whether
   * the range matches the filter's min/max boundaries.
   */
  handleApplyOrResetPriceFilterEmit: [
    event: RangeTuple,
    filterMin: number,
    filterMax: number,
  ]
  /**
   * Emitted when the reduction (discount) range changes via slider drag, click, or input field.
   * The parent is responsible for applying or resetting the filter based on whether
   * the range matches the filter's min/max boundaries.
   */
  handleApplyOrResetReductionFilterEmit: [
    event: RangeTuple,
    filterMin: number,
    filterMax: number,
  ]
  /** Emitted when the user resets the price range filter to its default boundaries. */
  resetPriceFilter: []
  /** Emitted when the user resets the reduction (discount) range filter to its default boundaries. */
  resetReductionFilter: []
  /** Emitted when the user clears all selections for a given attribute filter group. */
  resetAttributeFilter: [slug: string]
}>()

const getBooleanFilterLabel = ({ name, slug }: BooleanFilter) => {
  return slug !== 'sale' ? name : $t('filter_slide_in_content.only_sale_option')
}

/** Resolves swatch color and contrast from `FILTER_COLORS` for a filter value. */
const colorSwatchProps = (item: AttributeFilterValue) => {
  const entry = FILTER_COLORS[item.value]

  return {
    color: entry?.color ?? '#cccccc',
    contrast: entry?.showBorder ? ('low' as const) : ('high' as const),
  }
}
</script>

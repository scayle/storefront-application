import type { MaybeRefOrGetter } from 'vue'
import { ref, toRef, toValue } from 'vue'
import {
  createNewAttributeQuery,
  createNewBoolAttributeQuery,
  createNewPriceQuery,
  createNewReductionQuery,
  getClearedFilterQueryByKey,
  getClearedFiltersQuery,
} from '@scayle/storefront/shared'
import type {
  AppliedFilters,
  AppliedRangeFilter,
  Pagination,
  RangeTuple,
} from '@scayle/storefront/types'
import type { Page } from '@inertiajs/core'
import { useToast } from '@client/composables/useToast'
import { useProductEvents } from '@client/composables/tracking/useProductEvents'
import type {
  ApplyFilterTrackingPayload,
  ProductListSurface,
} from '@client/composables/tracking/useProductEvents'
import { PRODUCT_LISTING_RELOAD_PROPS } from '@shared/constants/productListing'
import { useI18n } from 'vue-i18n'
import { useRoute } from './useRoute'

/**
 * One filter value change, recorded before the Inertia reload and completed
 * with the reloaded page props (active filter count, result count) when the
 * reload succeeds. A navigation that changes several values, such as a reset,
 * records one change per value.
 */
type FilterChange = Pick<
  ApplyFilterTrackingPayload,
  'filter_slug' | 'filter_value' | 'filter_action'
>

/**
 * The two range filters, keyed by their `filter_slug`, which is also the key
 * `getClearedFilterQueryByKey` clears them by: how to read the applied range,
 * and the SDK helper that writes its bounds.
 */
const RANGE_FILTERS = {
  prices: {
    applied: (filters: AppliedFilters) => filters.price,
    createQuery: createNewPriceQuery,
  },
  reductions: {
    applied: (filters: AppliedFilters) => filters.reduction,
    createQuery: createNewReductionQuery,
  },
}

type RangeFilterSlug = keyof typeof RANGE_FILTERS

/**
 * Formats an applied range as the `apply_filter` value `min-max`. The slider
 * always sets both bounds; only a hand-written URL such as
 * `?filters[maxPrice]=5000` leaves one out, which stays empty (`-5000`)
 * rather than rendering as `undefined`.
 */
const formatRange = (range: AppliedRangeFilter) =>
  `${range.min ?? ''}-${range.max ?? ''}`

const toChange = (
  slug: string,
  value: string,
  action: FilterChange['filter_action'],
): FilterChange => ({
  filter_slug: slug,
  filter_value: value,
  filter_action: action,
})

const attributeRemovals = (
  slug: string,
  values: readonly (string | number)[],
): FilterChange[] =>
  values.map((value) => toChange(slug, String(value), 'remove'))

const rangeRemovals = (
  slug: string,
  applied: AppliedRangeFilter | undefined,
): FilterChange[] =>
  applied ? [toChange(slug, formatRange(applied), 'remove')] : []

/**
 * Lists the removal of every applied filter value, in the order the
 * `apply_filter` events of a reset go out: attribute values, boolean filters,
 * then the price and reduction ranges. The values match what unchecking each
 * one on its own reports.
 */
const toRemovals = (appliedFilters: AppliedFilters): FilterChange[] => [
  ...Object.entries(appliedFilters.attributes).flatMap(([slug, values]) =>
    attributeRemovals(slug, values),
  ),
  // A hand-written `?filters[sale]=false` parses to `false`. The Storefront API
  // never applied it, so there is nothing to report as removed.
  ...Object.entries(appliedFilters.booleans)
    .filter(([, isApplied]) => isApplied)
    .map(([slug]) => toChange(slug, 'true', 'remove')),
  ...Object.entries(RANGE_FILTERS).flatMap(([slug, range]) =>
    rangeRemovals(slug, range.applied(appliedFilters)),
  ),
]

/** Reloaded page props the `apply_filter` event reads after a filter change. */
type ReloadedListingProps = Partial<{
  appliedFilters: AppliedFilters
  pagination: Pagination
}>

/**
 * Counts the applied filter options for `apply_filter.active_filters`: every
 * selected attribute value, every applied boolean filter and each set range. Two
 * colors count as two, unlike `appliedFilters.count`, which counts filter
 * groups for the toggle badge.
 */
const countAppliedFilterOptions = (appliedFilters: AppliedFilters) =>
  Object.values(appliedFilters.attributes).reduce(
    (sum, values) => sum + values.length,
    0,
  ) +
  Object.values(appliedFilters.booleans).filter(Boolean).length +
  Object.values(RANGE_FILTERS).filter((range) => {
    const applied = range.applied(appliedFilters)
    return applied?.min !== undefined || applied?.max !== undefined
  }).length

/**
 * Composable for product listing filter and sort state and actions.
 * Syncs filter/sort with the URL via Inertia visits and shows toasts when the slide-in closes.
 * Used on the product listing page and in filter/sort components (e.g. SFFilterSlideIn).
 *
 * Fires the SCAYLE Analytics `apply_filter` event for every single filter value
 * that is added or removed, once the partial reload landed, so the active
 * filter and result counts describe the grid after the change. A reset
 * (`resetAllFilters`, `resetAttributeFilter` on a group with several values)
 * fires one `remove` per cleared value, all reporting the grid state after the
 * reset, so the removals pair with the adds that applied those values. Values
 * the page was opened with, such as a pre-filtered category link, never fired
 * an add, because no filter interaction happened.
 *
 * @param _appliedFilter Currently applied filters from the server (listing page props)
 * @param _surface SCAYLE Analytics surface of the grid the filters apply to,
 *   the same one the page passes to `SFProductGrid`. Every caller passes one,
 *   including reset-only controls such as the no-results messages, so a reset
 *   never goes unreported.
 *
 * @returns Actions to apply/reset price, reduction, and attribute filters, reset all,
 *   and open and close handlers that show success toasts when filters or sort
 *   changed while the slide-in was open
 *
 * @example
 * ```ts
 * const { resetAllFilters, onSlideInOpen, onSlideInClose } = useFilter(
 *   () => props.appliedFilters,
 *   () => ({ product_list_type: 'category', product_list_id: props.category.id.toString() }),
 * )
 * // In filter slide-in: onOpen={onSlideInOpen} onClose={onSlideInClose}
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/shopping-experience/browsing/product-listing-page
 */
export const useFilter = (
  _appliedFilter: MaybeRefOrGetter<AppliedFilters>,
  _surface: MaybeRefOrGetter<ProductListSurface>,
) => {
  const appliedFilter = toRef(_appliedFilter)
  const { query, path, navigate } = useRoute()
  const { show } = useToast()
  const { trackApplyFilter } = useProductEvents()

  const areFiltersUpdated = ref(false)

  const { t } = useI18n()

  const sort = ref(query.value.get('sort'))

  /**
   * Fires `apply_filter` once the reload landed, so `active_filters` and
   * `result_count` describe the grid after the change.
   */
  const trackFilterChange = (change: FilterChange, page: Page) => {
    const { appliedFilters, pagination } = page.props as ReloadedListingProps
    if (!appliedFilters || !pagination) {
      return
    }

    trackApplyFilter({
      ...change,
      ...toValue(_surface),
      active_filters: countAppliedFilterOptions(appliedFilters),
      result_count: pagination.totalItems,
    })
  }

  /**
   * Navigates to the listing with the given query via a partial reload.
   *
   * @param query Full query to navigate to. Copied before `page` is removed,
   *   so the argument stays unchanged. `useRoute().query` is one shared
   *   `URLSearchParams` until the URL changes.
   * @param changes The filter values this navigation adds or removes, tracked
   *   as one `apply_filter` each after the reload. Empty when the navigation
   *   changes no filter value.
   * @param onApplied Runs once the reload landed. A failed reload keeps the
   *   page and shows the error toast instead, so it must not also confirm the
   *   change.
   */
  const applyFilter = (
    query: URLSearchParams,
    changes: FilterChange[] = [],
    onApplied?: () => void,
  ) => {
    areFiltersUpdated.value = true

    // A failed reload keeps the page, so `onSlideInClose` has no change to
    // confirm. Returns nothing, since `false` would also skip the global
    // error toast.
    const discardFiltersUpdated = () => {
      areFiltersUpdated.value = false
    }

    const nextQuery = new URLSearchParams(query)
    nextQuery.delete('page')

    const queryString = nextQuery.toString()
    const nextUrl = queryString ? `${path.value}?${queryString}` : path.value

    navigate(nextUrl, {
      only: [...PRODUCT_LISTING_RELOAD_PROPS, 'appliedFilters', 'filters'],
      preserveState: true,
      replace: true,
      onSuccess: (reloaded: Page) => {
        onApplied?.()
        for (const filterChange of changes) {
          trackFilterChange(filterChange, reloaded)
        }
      },
      onHttpException: discardFiltersUpdated,
      onNetworkError: discardFiltersUpdated,
    })
  }

  /**
   * Clears one range filter and tracks the removal of the range that was
   * applied. Shared by the reset actions and the slider at its bounds, so
   * both paths report the same `apply_filter`.
   */
  const clearRangeFilter = (slug: RangeFilterSlug) => {
    const applied = RANGE_FILTERS[slug].applied(appliedFilter.value)

    applyFilter(
      getClearedFilterQueryByKey(query.value, slug),
      rangeRemovals(slug, applied),
    )
  }

  const resetPriceFilter = () => clearRangeFilter('prices')

  const resetReductionFilter = () => clearRangeFilter('reductions')

  /**
   * Clears one attribute group and tracks the removal of each value it held,
   * the same `apply_filter` unchecking those values one by one reports.
   */
  const resetAttributeFilter = (slug: string) => {
    applyFilter(
      getClearedFilterQueryByKey(query.value, slug),
      attributeRemovals(slug, appliedFilter.value.attributes[slug] ?? []),
    )
  }

  const resetAllFilters = () => {
    const clearedQuery = getClearedFiltersQuery(query.value)
    if (clearedQuery.toString() === query.value.toString()) {
      return
    }

    applyFilter(clearedQuery, toRemovals(appliedFilter.value), () => {
      show(t('filter.notification.all_filters_cleared'), { type: 'SUCCESS' })
    })

    areFiltersUpdated.value = false
  }

  /**
   * Applies a range filter from the slider, or clears it when the slider sits
   * at both bounds. A slider at its bounds is the range filter's "no filter"
   * state, so it must clear the filter instead of applying the full range,
   * which would otherwise keep the filter active.
   */
  const handleRangeFilterEmit = (
    event: RangeTuple,
    min: number,
    max: number,
    slug: RangeFilterSlug,
  ) => {
    if (event[0] === min && event[1] === max) {
      return clearRangeFilter(slug)
    }

    applyFilter(RANGE_FILTERS[slug].createQuery(query.value, event), [
      toChange(slug, `${event[0]}-${event[1]}`, 'add'),
    ])
  }

  const applyAttributeFilter = (slug: string, id: string) => {
    const newQuery = createNewAttributeQuery(query.value, { slug, id })

    applyFilter(newQuery, [
      toChange(
        slug,
        id,
        appliedFilter.value.attributes[slug]?.includes(id) ? 'remove' : 'add',
      ),
    ])
  }

  const applyBooleanFilter = (slug: string) => {
    const isApplied = appliedFilter.value.booleans[slug]

    applyFilter(createNewBoolAttributeQuery(query.value, slug), [
      toChange(slug, 'true', isApplied ? 'remove' : 'add'),
    ])
  }

  /**
   * Records the sort the slide-in opens with, so the close toast reports only
   * a sort chosen inside it. The desktop sort dropdown changes the sort while
   * the slide-in is closed.
   */
  const onSlideInOpen = () => {
    sort.value = query.value.get('sort')
  }

  const onSlideInClose = () => {
    const isSortUpdated = sort.value !== query.value.get('sort')

    if (areFiltersUpdated.value && isSortUpdated) {
      show(t('filter.notification.filter_and_sort_updated'), {
        type: 'SUCCESS',
      })
    } else if (areFiltersUpdated.value) {
      show(t('filter.notification.filter_updated'), { type: 'SUCCESS' })
    } else if (isSortUpdated) {
      show(t('filter.notification.sort_updated'), { type: 'SUCCESS' })
    }

    areFiltersUpdated.value = false
  }

  return {
    applyFilter,
    handleApplyOrResetPriceFilterEmit: (
      event: RangeTuple,
      min: number,
      max: number,
    ) => handleRangeFilterEmit(event, min, max, 'prices'),
    handleApplyOrResetReductionFilterEmit: (
      event: RangeTuple,
      min: number,
      max: number,
    ) => handleRangeFilterEmit(event, min, max, 'reductions'),
    resetPriceFilter,
    resetReductionFilter,
    resetAttributeFilter,
    applyAttributeFilter,
    applyBooleanFilter,
    resetAllFilters,
    onSlideInOpen,
    onSlideInClose,
  }
}

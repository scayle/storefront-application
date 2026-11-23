import type { SortOption } from '@scayle/storefront/types'

/**
 * Translation keys for product listing sort options, keyed by sort option key.
 *
 * Sort options cross the server-client boundary as `{ key, config }` plus an
 * optional `label` that only listing providers with their own keys set. The
 * built-in options carry no label, so their display labels resolve client-side
 * via vue-i18n in the sorting components (`SFSortSelection`,
 * `SFMobileSortSelection`) through {@link getSortOptionLabel}.
 */
export const SORT_OPTION_LABEL_KEYS: Record<SortOption['key'], string> = {
  default: 'sorting_select.top_seller',
  newest: 'sorting_select.date_newest',
  price_desc: 'sorting_select.price_desc',
  price_asc: 'sorting_select.price_asc',
  reduction_desc: 'sorting_select.reduction_desc',
}

/**
 * Resolves the display label of a sort option for the sorting components.
 *
 * A listing provider that supplies a `label` wins, even when it reuses a
 * built-in key such as `default`. Without one, a built-in key resolves through
 * {@link SORT_OPTION_LABEL_KEYS}. The raw key is the last resort so a provider
 * that sends neither still renders something.
 *
 * @param option Sort option to label.
 * @param t Translation function, usually `$t` or `useI18n().t`.
 * @returns The provider label, otherwise the translated label for a built-in
 *   key, otherwise the key.
 */
export const getSortOptionLabel = (
  option: Pick<SortOption, 'key' | 'label'>,
  t: (key: string) => string,
): string => {
  if (option.label) {
    return option.label
  }
  const labelKey = SORT_OPTION_LABEL_KEYS[option.key]
  return labelKey ? t(labelKey) : option.key
}

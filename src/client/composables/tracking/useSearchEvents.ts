import {
  ANALYTICS_MAX_PATH_LENGTH,
  localizeLink,
} from '@scayle/storefront/shared'
import type { SearchResolveResult } from '@scayle/storefront/types'
import type {
  AnalyticsSearchDestinationType,
  AnalyticsSearchEvent,
} from '@scayle/storefront-api'
import { TrackingEventNames } from '@shared/types/Tracking'
import {
  ANALYTICS_SEARCH_ENTITY_TYPES,
  mapSearchSuggestionForAnalytics,
} from '@client/utils/tracking'
import type { SearchSuggestionEntry } from '@client/utils/search'
import { useTracking } from '@client/composables/tracking/useTracking'
import { useAnalytics } from '@client/composables/tracking/useAnalytics'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'

/**
 * Where a submitted search took the user, for the GA4 and SCAYLE Analytics
 * `search` events: the search results page with its result count, or the
 * entity the term resolved to (a `SearchResolveResult` from
 * `useSearch().resolveSearch`).
 */
export type SearchDestination =
  | {
      /** The term did not resolve, so the search results page rendered. */
      type: 'term'
      /** Path of the search results page, including the query string. */
      link: string
      /** Number of products on the search results page. */
      resultCount: number
    }
  | SearchResolveResult

/**
 * Tracks search events: the outcome of a submitted search and the suggestion
 * dropdown. Used by the search results page and `SFSearchField`. GA4 and
 * SCAYLE Analytics are two independent calls: `trackSearchOutcome` fires
 * both `search` events, the suggestion functions fire SCAYLE Analytics only.
 *
 * @returns Tracking functions for search outcomes and search suggestion
 * impressions and clicks.
 *
 * @example
 * ```ts
 * const { trackSearchOutcome } = useSearchEvents()
 *
 * trackSearchOutcome('boots', {
 *   type: 'term',
 *   link: '/search?filters[term]=boots',
 *   resultCount: 8,
 * })
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/analytics-and-tracking/google-tag-manager/tracking-events
 */
export function useSearchEvents() {
  const { push } = useTracking()
  const { track } = useAnalytics()
  const { config } = useStorefrontConfig()

  /**
   * Tracks one suggestion event. The route drops a `suggestion_url` over its
   * path cap, and the Storefront API refuses the event without it, so such a
   * suggestion is skipped instead.
   */
  const trackSuggestion = (
    eventName: 'view_search_suggestion' | 'select_search_suggestion',
    entry: SearchSuggestionEntry,
    index: number,
    entries: SearchSuggestionEntry[],
    searchTerm: string,
  ): void => {
    const payload = mapSearchSuggestionForAnalytics(
      config.value,
      entry,
      index + 1,
      entries.length,
      searchTerm,
    )
    if (payload.suggestion_url.length > ANALYTICS_MAX_PATH_LENGTH) {
      return
    }
    track(eventName, payload)
  }

  /**
   * Tracks the outcome of a submitted search: the GA4 and the SCAYLE
   * Analytics `search` event, with the same payload. The results page reports
   * the `term` destination once on mount, and `SFSearchField` reports a
   * resolved category, product or navigation item before navigating there.
   *
   * @param searchTerm The raw query the user submitted.
   * @param destination The results page with its count, or the resolve result.
   */
  const trackSearchOutcome = (
    searchTerm: string,
    destination: SearchDestination,
  ): void => {
    if (!searchTerm) {
      return
    }
    const shared = {
      search_term: searchTerm,
      search_destination_url: localizeLink(config.value, destination.link),
    }

    const payload: Omit<AnalyticsSearchEvent, 'event_name'> =
      destination.type === 'term'
        ? {
            ...shared,
            search_destination_type: 'term',
            search_result_count: destination.resultCount,
          }
        : {
            ...shared,
            search_destination_type: ANALYTICS_SEARCH_ENTITY_TYPES[
              destination.type
            ] satisfies AnalyticsSearchDestinationType,
            search_destination_id: destination.id,
            // A category resolves with `filters: []` when nothing narrows it,
            // so the field is only sent when there are filter groups to name.
            ...(destination.type === 'category' && destination.filters.length
              ? {
                  search_destination_filter_groups: destination.filters.map(
                    (f) => f.key,
                  ),
                }
              : {}),
          }

    push({ event: TrackingEventNames.Search, ...payload })
    track('search', payload)
  }

  /**
   * Tracks one SCAYLE Analytics `view_search_suggestion` per rendered
   * suggestion. Call it when the dropdown renders a suggestions result. The
   * "show all results" link is not a suggestion and is not reported.
   *
   * @param entries Suggestions in dropdown order, from `flattenSearchSuggestions`.
   * @param searchTerm The query typed when the dropdown rendered.
   */
  const trackViewSearchSuggestions = (
    entries: SearchSuggestionEntry[],
    searchTerm: string,
  ): void => {
    // A suggestion skipped for its link length still counts towards the
    // positions of the rows after it, matching what is shown.
    entries.forEach((entry, index) => {
      trackSuggestion(
        'view_search_suggestion',
        entry,
        index,
        entries,
        searchTerm,
      )
    })
  }

  /**
   * Tracks the SCAYLE Analytics `select_search_suggestion` event for a clicked
   * or keyboard-selected suggestion. The search it leads to is reported by
   * `trackSearchOutcome` or the destination page, not here.
   *
   * @param entry The selected suggestion. Must be an element of `entries`:
   * the position is resolved by reference, and an entry that is not in the
   * list is not reported.
   * @param entries Suggestions in dropdown order, which give position and total.
   * @param searchTerm The query typed when the dropdown rendered.
   */
  const trackSelectSearchSuggestion = (
    entry: SearchSuggestionEntry,
    entries: SearchSuggestionEntry[],
    searchTerm: string,
  ): void => {
    const index = entries.indexOf(entry)
    // `position` is 1-based, and a copy of an entry would report 0, which the
    // specification has no meaning for, so the event is dropped instead.
    if (index === -1) {
      return
    }
    trackSuggestion(
      'select_search_suggestion',
      entry,
      index,
      entries,
      searchTerm,
    )
  }

  return {
    trackSearchOutcome,
    trackViewSearchSuggestions,
    trackSelectSearchSuggestion,
  }
}

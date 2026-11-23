import { describe, expect, it, vi } from 'vitest'
import type { SearchSuggestionEntry } from '@client/utils/search'
import { ANALYTICS_MAX_PATH_LENGTH } from '@scayle/storefront/shared'
import { createMockListingProduct } from '../../../test/mock-data/products'
import {
  createMockCategorySuggestion,
  createMockNavigationItemSuggestion,
  createMockProductSuggestion,
} from '../../../test/mock-data/search'
import { useSearchEvents } from './useSearchEvents'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  track: vi.fn(),
}))

vi.mock('./useTracking', () => ({
  useTracking: () => ({ push: mocks.push }),
}))

vi.mock('./useAnalytics', () => ({
  useAnalytics: () => ({ track: mocks.track }),
}))

// A shop under the `path` country selector, so the real `localizeLink` adds
// the `/de` prefix the events report.
vi.mock('@client/composables/usePage', () => ({
  usePage: () => ({
    props: {
      storefront: {
        config: { countrySelector: 'path' },
        country: { path: 'de' },
      },
    },
  }),
}))

describe('useSearchEvents', () => {
  describe('trackSearchOutcome', () => {
    it('reports the search results page as a term destination', () => {
      const { trackSearchOutcome } = useSearchEvents()

      trackSearchOutcome('boots', {
        type: 'term',
        link: '/search?filters[term]=boots',
        resultCount: 8,
      })

      expect(mocks.track).toHaveBeenCalledWith('search', {
        search_term: 'boots',
        search_destination_type: 'term',
        search_destination_url: '/de/search?filters[term]=boots',
        search_result_count: 8,
      })
    })

    it('pushes the GA4 search with the same payload as the SCAYLE Analytics search', () => {
      const { trackSearchOutcome } = useSearchEvents()

      trackSearchOutcome('red shoes', {
        type: 'category',
        id: 5,
        link: '/c/shoes-5?filters[color]=10',
        filters: [{ key: 'color', label: 'Color', values: ['Red'] }],
      })

      expect(mocks.push).toHaveBeenCalledWith({
        event: 'search',
        ...mocks.track.mock.calls[0]![1],
      })
    })

    it('reports a resolved category with its id and filter group keys', () => {
      const { trackSearchOutcome } = useSearchEvents()

      trackSearchOutcome('red shoes', {
        type: 'category',
        id: 5,
        link: '/c/shoes-5?filters[color]=10',
        filters: [{ key: 'color', label: 'Color', values: ['Red'] }],
      })

      expect(mocks.track).toHaveBeenCalledWith('search', {
        search_term: 'red shoes',
        search_destination_type: 'category',
        search_destination_url: '/de/c/shoes-5?filters[color]=10',
        search_destination_id: 5,
        search_destination_filter_groups: ['color'],
      })
    })

    it.each([
      { type: 'product' as const, expected: 'product' },
      { type: 'navigationItem' as const, expected: 'navigation_item' },
    ])(
      'reports a resolved $type without filter groups',
      ({ type, expected }) => {
        const { trackSearchOutcome } = useSearchEvents()

        trackSearchOutcome('sale', { type, id: 42, link: '/target' })

        expect(mocks.track).toHaveBeenCalledWith('search', {
          search_term: 'sale',
          search_destination_type: expected,
          search_destination_url: '/de/target',
          search_destination_id: 42,
        })
      },
    )

    it('omits the filter groups for a category resolved without narrowing filters', () => {
      const { trackSearchOutcome } = useSearchEvents()

      trackSearchOutcome('shoes', {
        type: 'category',
        id: 5,
        link: '/c/shoes-5',
        filters: [],
      })

      expect(mocks.track.mock.calls[0]![1]).not.toHaveProperty(
        'search_destination_filter_groups',
      )
    })

    it('tracks nothing for an empty term', () => {
      const { trackSearchOutcome } = useSearchEvents()

      trackSearchOutcome('', { type: 'term', link: '/search', resultCount: 0 })

      expect(mocks.push).not.toHaveBeenCalled()
      expect(mocks.track).not.toHaveBeenCalled()
    })
  })

  describe('search suggestion events', () => {
    const category = createMockCategorySuggestion({
      id: 5,
      link: '/c/shoes-5?filters[color]=10&filters[sale]=true',
      filters: [
        { key: 'color', label: 'Color', values: ['Red'] },
        { key: 'sale', label: 'Sale', values: ['true'] },
      ],
    })
    const product = createMockProductSuggestion({
      product: createMockListingProduct({ id: 42, link: '/p/sneaker-42' }),
    })
    const navigationItem = createMockNavigationItemSuggestion({
      id: 7,
      link: '/pages/about',
    })
    const entries: SearchSuggestionEntry[] = [
      { type: 'category', item: category },
      { type: 'product', item: product },
      { type: 'navigationItem', item: navigationItem },
    ]

    it('tracks one view_search_suggestion per row with its dropdown position', () => {
      const { trackViewSearchSuggestions } = useSearchEvents()

      trackViewSearchSuggestions(entries, 'sho')

      expect(mocks.push).not.toHaveBeenCalled()
      expect(mocks.track).toHaveBeenCalledTimes(3)
      expect(mocks.track).toHaveBeenNthCalledWith(1, 'view_search_suggestion', {
        position: 1,
        total: 3,
        search_term: 'sho',
        suggestion_type: 'category',
        suggestion_id: '5',
        suggestion_url: '/de/c/shoes-5?filters[color]=10&filters[sale]=true',
        suggestion_filter_groups: ['color', 'sale'],
      })
      expect(mocks.track).toHaveBeenNthCalledWith(2, 'view_search_suggestion', {
        position: 2,
        total: 3,
        search_term: 'sho',
        suggestion_type: 'product',
        suggestion_id: '42',
        suggestion_url: '/de/p/sneaker-42',
      })
      expect(mocks.track).toHaveBeenNthCalledWith(3, 'view_search_suggestion', {
        position: 3,
        total: 3,
        search_term: 'sho',
        suggestion_type: 'navigation_item',
        suggestion_id: '7',
        suggestion_url: '/de/pages/about',
      })
    })

    it('tracks select_search_suggestion with the position of the selected row', () => {
      const { trackSelectSearchSuggestion } = useSearchEvents()

      trackSelectSearchSuggestion(entries[1]!, entries, 'sho')

      expect(mocks.track).toHaveBeenCalledTimes(1)
      expect(mocks.track).toHaveBeenCalledWith('select_search_suggestion', {
        position: 2,
        total: 3,
        search_term: 'sho',
        suggestion_type: 'product',
        suggestion_id: '42',
        suggestion_url: '/de/p/sneaker-42',
      })
    })

    it('does not report a select for an entry that is not in the dropdown list', () => {
      const { trackSelectSearchSuggestion } = useSearchEvents()

      // A structural copy is not the rendered row; its position would be 0.
      trackSelectSearchSuggestion({ ...entries[1]! }, entries, 'sho')

      expect(mocks.track).not.toHaveBeenCalled()
    })

    it('omits the filter groups for a category suggestion without filters', () => {
      const { trackViewSearchSuggestions } = useSearchEvents()
      const plainCategory = createMockCategorySuggestion({ id: 9, filters: [] })

      trackViewSearchSuggestions(
        [{ type: 'category', item: plainCategory }],
        'sho',
      )

      const [, payload] = mocks.track.mock.calls[0]!
      expect(payload).not.toHaveProperty('suggestion_filter_groups')
      expect(payload).toMatchObject({ search_term: 'sho' })
    })

    it('keeps a link that already carries the country prefix as it is', () => {
      const { trackSelectSearchSuggestion } = useSearchEvents()
      const localized: SearchSuggestionEntry = {
        type: 'navigationItem',
        item: createMockNavigationItemSuggestion({ id: 3, link: '/de/sale' }),
      }

      trackSelectSearchSuggestion(localized, [localized], 'sale')

      expect(mocks.track).toHaveBeenCalledWith(
        'select_search_suggestion',
        expect.objectContaining({ suggestion_url: '/de/sale' }),
      )
    })

    it('skips a suggestion whose localized link exceeds the analytics route path limit', () => {
      const { trackViewSearchSuggestions } = useSearchEvents()
      // Within the limit on its own, over it with the `/de` prefix.
      const atLimit: SearchSuggestionEntry = {
        type: 'navigationItem',
        item: createMockNavigationItemSuggestion({
          id: 4,
          link: `/${'a'.repeat(ANALYTICS_MAX_PATH_LENGTH - 1)}`,
        }),
      }

      trackViewSearchSuggestions([atLimit], 'sale')

      expect(mocks.track).not.toHaveBeenCalled()
    })

    it('skips a suggestion whose link exceeds the analytics route path limit and keeps the positions of the rest', () => {
      const { trackViewSearchSuggestions, trackSelectSearchSuggestion } =
        useSearchEvents()
      const oversized: SearchSuggestionEntry = {
        type: 'navigationItem',
        item: createMockNavigationItemSuggestion({
          id: 8,
          link: `/pages/${'a'.repeat(ANALYTICS_MAX_PATH_LENGTH)}`,
        }),
      }
      const rows = [entries[0]!, oversized, entries[2]!]

      trackViewSearchSuggestions(rows, 'sho')
      trackSelectSearchSuggestion(oversized, rows, 'sho')

      // Two impressions, no select: the oversized row is skipped, while the
      // rows around it keep their dropdown positions and the total of three.
      expect(mocks.track).toHaveBeenCalledTimes(2)
      expect(mocks.track).toHaveBeenNthCalledWith(
        1,
        'view_search_suggestion',
        expect.objectContaining({ position: 1, total: 3 }),
      )
      expect(mocks.track).toHaveBeenNthCalledWith(
        2,
        'view_search_suggestion',
        expect.objectContaining({ position: 3, total: 3, suggestion_id: '7' }),
      )
    })
  })
})

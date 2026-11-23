import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppliedFilters } from '@scayle/storefront/types'
import type { ReactivePageMock } from '@test/utils/inertia'
import { useFilter } from './useFilter'

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
  routerVisit: vi.fn(),
  toastShow: vi.fn(),
  trackApplyFilter: vi.fn(),
}))

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage } = await import('@test/utils/inertia')
  mocks.reactivePage = createReactivePage(
    {
      storefront: {
        config: {},
        origin: 'https://example.com',
        country: { path: 'de', isDefault: false },
      },
    },
    { url: '/c/shoes?sort=price_asc' },
  )
  return {
    usePage: vi.fn(() => mocks.reactivePage),
    router: { visit: (...args: unknown[]) => mocks.routerVisit(...args) },
  }
})

vi.mock('@client/composables/useToast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@client/composables/tracking/useProductEvents', () => ({
  useProductEvents: () => ({ trackApplyFilter: mocks.trackApplyFilter }),
}))

/** Resolves the last visit as Inertia would, with the reloaded page props. */
function succeedLastVisit(props: Record<string, unknown>) {
  const options = mocks.routerVisit.mock.calls.at(-1)?.[1] as {
    onSuccess?: (page: { props: Record<string, unknown> }) => void
  }
  options.onSuccess?.({ props })
}

/** Fails the last visit through the given Inertia visit callback. */
function failLastVisit(callback: 'onHttpException' | 'onNetworkError') {
  const options = mocks.routerVisit.mock.calls.at(-1)?.[1] as Partial<
    Record<typeof callback, () => unknown>
  >
  return options[callback]?.()
}

/** Points the mocked Inertia page at a new URL for the next read. */
function setUrl(url: string) {
  mocks.reactivePage!.url = url
}

// Three filter groups (`count`) holding four options: `active_filters` reports
// the options.
const reloadedListingProps = {
  appliedFilters: createAppliedFilters({
    attributes: { color: ['1', '2'], size: ['7'] },
    booleans: { sale: true },
    count: 3,
  }),
  pagination: { totalItems: 23 },
}

const categorySurface = {
  product_list_type: 'category',
  product_list_id: '50342',
} as const

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

function createAppliedFilters(
  overrides: Partial<AppliedFilters> = {},
): AppliedFilters {
  return {
    attributes: {},
    booleans: {},
    count: 0,
    ...overrides,
  }
}

describe('useFilter', () => {
  beforeEach(() => {
    setUrl('/c/shoes?sort=price_asc')
  })

  describe('applyFilter', () => {
    it('calls router.visit with path and partial reload options', () => {
      const appliedFilter = createAppliedFilters()
      const { applyFilter } = useFilter(appliedFilter, categorySurface)

      applyFilter(new URLSearchParams({ 'filters[minPrice]': '10' }))

      expect(mocks.routerVisit).toHaveBeenCalledTimes(1)
      expect(mocks.routerVisit).toHaveBeenCalledWith(
        // cspell:disable-next-line -- `%5BminPrice%5D` tokenizes as "Bmin"
        '/de/c/shoes?filters%5BminPrice%5D=10',
        expect.objectContaining({
          only: ['products', 'pagination', 'meta', 'appliedFilters', 'filters'],
          preserveState: true,
          replace: true,
        }),
      )
    })

    it('removes page query param when applying a filter', () => {
      setUrl('/c/shoes?sort=price_asc&page=3')
      const appliedFilter = createAppliedFilters()
      const { applyFilter } = useFilter(appliedFilter, categorySurface)

      // The query a filter action builds still carries the page it was on.
      const query = new URLSearchParams({
        sort: 'price_asc',
        page: '3',
        'filters[color]': '1',
      })
      applyFilter(query)

      expect(query.get('page')).toBe('3')

      expect(mocks.routerVisit).toHaveBeenCalledTimes(1)
      const path = mocks.routerVisit.mock.calls[0]![0] as string
      // cspell:disable-next-line -- `%5Bcolor%5D` tokenizes as "Bcolor"
      expect(path).toContain('filters%5Bcolor%5D=1')
      expect(path).toContain('sort=price_asc')
      expect(path).not.toContain('page=')
    })

    it('does not track a bare navigation without a filter change', () => {
      const { applyFilter } = useFilter(createAppliedFilters(), categorySurface)

      applyFilter(new URLSearchParams({ 'filters[minPrice]': '10' }))
      succeedLastVisit(reloadedListingProps)

      expect(mocks.trackApplyFilter).not.toHaveBeenCalled()
    })
  })

  describe('apply_filter tracking', () => {
    it('tracks an added attribute value with the grid state after the reload', () => {
      const { applyAttributeFilter } = useFilter(
        createAppliedFilters(),
        categorySurface,
      )

      applyAttributeFilter('color', '1')

      expect(mocks.trackApplyFilter).not.toHaveBeenCalled()
      succeedLastVisit(reloadedListingProps)

      expect(mocks.trackApplyFilter).toHaveBeenCalledWith({
        filter_slug: 'color',
        filter_value: '1',
        filter_action: 'add',
        product_list_type: 'category',
        product_list_id: '50342',
        active_filters: 4,
        result_count: 23,
      })
    })

    it('counts a set price or reduction range as one active filter', () => {
      const { applyAttributeFilter } = useFilter(
        createAppliedFilters(),
        categorySurface,
      )

      applyAttributeFilter('color', '1')
      succeedLastVisit({
        appliedFilters: createAppliedFilters({
          attributes: { color: ['1'] },
          price: { min: 1000, max: 5000 },
          reduction: { max: 30 },
          count: 3,
        }),
        pagination: { totalItems: 5 },
      })

      expect(mocks.trackApplyFilter).toHaveBeenCalledWith(
        expect.objectContaining({ active_filters: 3 }),
      )
    })

    it('does not count a boolean parsed as false as an active filter', () => {
      const { applyAttributeFilter } = useFilter(
        createAppliedFilters(),
        categorySurface,
      )

      applyAttributeFilter('color', '1')
      succeedLastVisit({
        appliedFilters: createAppliedFilters({
          attributes: { color: ['1'] },
          booleans: { sale: false },
          count: 1,
        }),
        pagination: { totalItems: 5 },
      })

      expect(mocks.trackApplyFilter).toHaveBeenCalledWith(
        expect.objectContaining({ active_filters: 1 }),
      )
    })

    it('tracks a removed attribute value when it was already applied', () => {
      const { applyAttributeFilter } = useFilter(
        createAppliedFilters({ attributes: { color: ['1', '2'] }, count: 2 }),
        categorySurface,
      )

      applyAttributeFilter('color', '2')
      succeedLastVisit(reloadedListingProps)

      expect(mocks.trackApplyFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          filter_slug: 'color',
          filter_value: '2',
          filter_action: 'remove',
        }),
      )
    })

    it('reports the surface the page passes in, here the search results', () => {
      const { applyBooleanFilter } = useFilter(
        createAppliedFilters({ term: 'shoes', booleans: { sale: true } }),
        { product_list_type: 'search_results', product_list_id: 'shoes' },
      )

      applyBooleanFilter('sale')
      succeedLastVisit({
        appliedFilters: createAppliedFilters({ term: 'shoes', count: 0 }),
        pagination: { totalItems: 120 },
      })

      expect(mocks.trackApplyFilter).toHaveBeenCalledWith({
        filter_slug: 'sale',
        filter_value: 'true',
        filter_action: 'remove',
        product_list_type: 'search_results',
        product_list_id: 'shoes',
        active_filters: 0,
        result_count: 120,
      })
    })

    it('tracks a boolean filter that was not applied as add', () => {
      const { applyBooleanFilter } = useFilter(
        createAppliedFilters(),
        categorySurface,
      )

      applyBooleanFilter('sale')
      succeedLastVisit(reloadedListingProps)

      expect(mocks.trackApplyFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          filter_slug: 'sale',
          filter_value: 'true',
          filter_action: 'add',
        }),
      )
    })

    it('keeps a missing range bound empty instead of rendering undefined', () => {
      const { resetPriceFilter } = useFilter(
        createAppliedFilters({ price: { max: 5000 } }),
        categorySurface,
      )

      resetPriceFilter()
      succeedLastVisit(reloadedListingProps)

      expect(mocks.trackApplyFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          filter_slug: 'prices',
          filter_value: '-5000',
          filter_action: 'remove',
        }),
      )
    })

    it('tracks a price range as add, and the slider back at its bounds as remove', () => {
      const { handleApplyOrResetPriceFilterEmit } = useFilter(
        createAppliedFilters({ price: { min: 20, max: 80 } }),
        categorySurface,
      )

      handleApplyOrResetPriceFilterEmit([30, 70], 0, 100)
      succeedLastVisit(reloadedListingProps)

      expect(mocks.trackApplyFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filter_slug: 'prices',
          filter_value: '30-70',
          filter_action: 'add',
        }),
      )

      handleApplyOrResetPriceFilterEmit([0, 100], 0, 100)
      succeedLastVisit(reloadedListingProps)

      expect(mocks.trackApplyFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filter_slug: 'prices',
          filter_value: '20-80',
          filter_action: 'remove',
        }),
      )
    })

    it('tracks the reset button of a range like the slider at its bounds', () => {
      const { resetPriceFilter, resetReductionFilter } = useFilter(
        createAppliedFilters({
          price: { min: 20, max: 80 },
          reduction: { min: 10, max: 40 },
        }),
        categorySurface,
      )

      resetPriceFilter()
      succeedLastVisit(reloadedListingProps)
      resetReductionFilter()
      succeedLastVisit(reloadedListingProps)

      expect(mocks.trackApplyFilter).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          filter_slug: 'prices',
          filter_value: '20-80',
          filter_action: 'remove',
        }),
      )
      expect(mocks.trackApplyFilter).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          filter_slug: 'reductions',
          filter_value: '10-40',
          filter_action: 'remove',
        }),
      )
    })

    it('does not track resetting a range that was not applied', () => {
      const { handleApplyOrResetReductionFilterEmit, resetPriceFilter } =
        useFilter(createAppliedFilters(), categorySurface)

      handleApplyOrResetReductionFilterEmit([0, 50], 0, 50)
      succeedLastVisit(reloadedListingProps)
      resetPriceFilter()
      succeedLastVisit(reloadedListingProps)

      expect(mocks.trackApplyFilter).not.toHaveBeenCalled()
    })

    it('tracks the reset of an attribute group as one remove per value', () => {
      setUrl('/c/shoes?filters[color]=1,2')
      const { resetAttributeFilter } = useFilter(
        createAppliedFilters({ attributes: { color: ['1', '2'] }, count: 1 }),
        categorySurface,
      )

      resetAttributeFilter('color')
      expect(mocks.trackApplyFilter).not.toHaveBeenCalled()
      succeedLastVisit({
        appliedFilters: createAppliedFilters(),
        pagination: { totalItems: 120 },
      })

      expect(mocks.trackApplyFilter).toHaveBeenCalledTimes(2)
      expect(mocks.trackApplyFilter).toHaveBeenCalledWith({
        ...categorySurface,
        filter_slug: 'color',
        filter_value: '1',
        filter_action: 'remove',
        active_filters: 0,
        result_count: 120,
      })
      expect(mocks.trackApplyFilter).toHaveBeenCalledWith(
        expect.objectContaining({ filter_value: '2', filter_action: 'remove' }),
      )
    })

    it('tracks resetting all filters as one remove per applied value of every filter kind', () => {
      setUrl('/c/shoes?filters[color]=1,2&filters[sale]=true')
      const { resetAllFilters } = useFilter(
        createAppliedFilters({
          attributes: { color: ['1', '2'], size: ['7'] },
          booleans: { sale: true, outlet: false },
          price: { min: 20, max: 80 },
          reduction: { min: 10, max: 40 },
          count: 5,
        }),
        categorySurface,
      )

      resetAllFilters()
      succeedLastVisit({
        appliedFilters: createAppliedFilters(),
        pagination: { totalItems: 120 },
      })

      expect(
        mocks.trackApplyFilter.mock.calls.map(
          ([event]) =>
            `${event.filter_slug}:${event.filter_value}:${event.filter_action}`,
        ),
      ).toEqual([
        'color:1:remove',
        'color:2:remove',
        'size:7:remove',
        'sale:true:remove',
        'prices:20-80:remove',
        'reductions:10-40:remove',
      ])
      expect(mocks.trackApplyFilter).toHaveBeenCalledWith(
        expect.objectContaining({ active_filters: 0, result_count: 120 }),
      )
    })

    it('tracks nothing when the reloaded page carries no listing props', () => {
      const { applyAttributeFilter } = useFilter(
        createAppliedFilters(),
        categorySurface,
      )

      applyAttributeFilter('color', '1')
      succeedLastVisit({})

      expect(mocks.trackApplyFilter).not.toHaveBeenCalled()
    })
  })

  describe('range filters', () => {
    /* cspell:disable -- the encoded `filters%5B…%5D` params tokenize as "Bmin". */
    const priceParams = ['filters%5BminPrice%5D', 'filters%5BmaxPrice%5D']
    const reductionParams = [
      'filters%5BminReduction%5D',
      'filters%5BmaxReduction%5D',
    ]
    const priceAppliedParams = [
      'filters%5BminPrice%5D=20',
      'filters%5BmaxPrice%5D=80',
    ]
    const reductionAppliedParams = [
      'filters%5BminReduction%5D=10',
      'filters%5BmaxReduction%5D=40',
    ]
    /* cspell:enable */
    /* cspell:enable */

    it.for([
      {
        label: 'price',
        reset: 'resetPriceFilter' as const,
        url: '/c/shoes?sort=price_asc&filters[minPrice]=10&filters[maxPrice]=100',
        clearedParams: priceParams,
      },
      {
        label: 'reduction',
        reset: 'resetReductionFilter' as const,
        url: '/c/shoes?sort=price_asc&filters[minReduction]=0&filters[maxReduction]=50',
        clearedParams: reductionParams,
      },
    ])(
      'builds the path without the $label params and calls router.visit',
      ({ reset, url, clearedParams }) => {
        setUrl(url)
        const { [reset]: resetFilter } = useFilter(
          createAppliedFilters(),
          categorySurface,
        )

        resetFilter()

        expect(mocks.routerVisit).toHaveBeenCalledTimes(1)
        const path = mocks.routerVisit.mock.calls[0]![0] as string
        for (const param of clearedParams) {
          expect(path).not.toContain(param)
        }
        expect(path).toContain('sort=price_asc')
      },
    )

    it.for([
      {
        label: 'price',
        emit: 'handleApplyOrResetPriceFilterEmit' as const,
        applied: { price: { min: 0, max: 100 } },
        url: '/c/shoes?sort=price_asc&filters[minPrice]=0&filters[maxPrice]=100',
        bounds: [0, 100] as [number, number],
        clearedParams: priceParams,
      },
      {
        label: 'reduction',
        emit: 'handleApplyOrResetReductionFilterEmit' as const,
        applied: { reduction: { min: 0, max: 50 } },
        url: '/c/shoes?sort=price_asc&filters[minReduction]=0&filters[maxReduction]=50',
        bounds: [0, 50] as [number, number],
        clearedParams: reductionParams,
      },
    ])(
      'clears the $label filter when the slider sits at both bounds',
      ({ emit, applied, url, bounds, clearedParams }) => {
        setUrl(url)
        const { [emit]: handleEmit } = useFilter(
          createAppliedFilters(applied),
          categorySurface,
        )

        handleEmit(bounds, bounds[0], bounds[1])

        expect(mocks.routerVisit).toHaveBeenCalledTimes(1)
        const path = mocks.routerVisit.mock.calls[0]![0] as string
        for (const param of clearedParams) {
          expect(path).not.toContain(param)
        }
      },
    )

    it.for([
      {
        label: 'price',
        emit: 'handleApplyOrResetPriceFilterEmit' as const,
        applied: { price: { min: 0, max: 100 } },
        event: [20, 80] as [number, number],
        bounds: [0, 100] as [number, number],
        addedParams: priceAppliedParams,
      },
      {
        label: 'reduction',
        emit: 'handleApplyOrResetReductionFilterEmit' as const,
        applied: { reduction: { min: 0, max: 50 } },
        event: [10, 40] as [number, number],
        bounds: [0, 50] as [number, number],
        addedParams: reductionAppliedParams,
      },
    ])(
      'applies the new $label query when the event differs from the applied filter',
      ({ emit, applied, event, bounds, addedParams }) => {
        const { [emit]: handleEmit } = useFilter(
          createAppliedFilters(applied),
          categorySurface,
        )

        handleEmit(event, bounds[0], bounds[1])

        expect(mocks.routerVisit).toHaveBeenCalledTimes(1)
        const path = mocks.routerVisit.mock.calls[0]![0] as string
        for (const param of addedParams) {
          expect(path).toContain(param)
        }
      },
    )
  })

  describe('applyAttributeFilter', () => {
    it('keeps a comma inside another filter value when toggling one', () => {
      setUrl('/c/shoes?filters[size]=7,5&filters[size]=36')
      const { applyAttributeFilter } = useFilter(
        createAppliedFilters({
          attributes: { size: ['7,5', '36'] },
          count: 1,
        }),
        categorySurface,
      )

      applyAttributeFilter('color', '18')

      const path = mocks.routerVisit.mock.calls[0]![0] as string
      // cspell:disable-next-line -- `%5Bsize%5D` tokenizes as "Bsize"
      expect(path).toContain('filters%5Bsize%5D=7%2C5&filters%5Bsize%5D=36')
      // cspell:disable-next-line -- `%5Bcolor%5D` tokenizes as "Bcolor"
      expect(path).toContain('filters%5Bcolor%5D=18')
    })
  })

  describe('applyBooleanFilter', () => {
    it('writes a boolean filter that was not applied as a single true', () => {
      const { applyBooleanFilter } = useFilter(
        createAppliedFilters(),
        categorySurface,
      )

      applyBooleanFilter('sale')

      const path = mocks.routerVisit.mock.calls[0]![0] as string
      // cspell:disable-next-line -- `%5Bsale%5D` tokenizes as "Bsale"
      expect(path).toBe('/de/c/shoes?sort=price_asc&filters%5Bsale%5D=true')
    })

    it('removes a boolean filter that was applied', () => {
      setUrl('/c/shoes?filters[sale]=true&sort=price_asc')
      const { applyBooleanFilter } = useFilter(
        createAppliedFilters({ booleans: { sale: true }, count: 1 }),
        categorySurface,
      )

      applyBooleanFilter('sale')

      const path = mocks.routerVisit.mock.calls[0]![0] as string
      expect(path).toBe('/de/c/shoes?sort=price_asc')
    })
  })

  describe('resetAttributeFilter', () => {
    it('builds path without the given attribute slug and calls router.visit', () => {
      setUrl('/c/shoes?sort=price_asc&filters[color]=1,2,3')
      const appliedFilter = createAppliedFilters()
      const { resetAttributeFilter } = useFilter(appliedFilter, categorySurface)

      resetAttributeFilter('color')

      expect(mocks.routerVisit).toHaveBeenCalledTimes(1)
      const path = mocks.routerVisit.mock.calls[0]![0] as string
      // cspell:disable-next-line -- `%5Bcolor%5D` tokenizes as "Bcolor"
      expect(path).not.toContain('filters%5Bcolor%5D')
      expect(path).toContain('sort=price_asc')
    })
  })

  describe('resetAllFilters', () => {
    it('builds path with only non-filter query params and resets page', () => {
      setUrl(
        '/c/shoes?sort=price_asc&page=2&filters[color]=1&filters[minPrice]=10',
      )
      const appliedFilter = createAppliedFilters()
      const { resetAllFilters } = useFilter(appliedFilter, categorySurface)

      resetAllFilters()

      expect(mocks.routerVisit).toHaveBeenCalledTimes(1)
      const path = mocks.routerVisit.mock.calls[0]![0] as string
      expect(path).toContain('sort=price_asc')
      expect(path).not.toContain('page=')
      // cspell:disable-next-line -- `%5Bcolor%5D` tokenizes as "Bcolor"
      expect(path).not.toContain('filters%5Bcolor%5D')
      // cspell:disable-next-line -- `%5BminPrice%5D` tokenizes as "Bmin"
      expect(path).not.toContain('filters%5BminPrice%5D')
    })

    it('builds path without filter params when only filter params exist', () => {
      setUrl('/c/shoes?filters[color]=1')
      const appliedFilter = createAppliedFilters()
      const { resetAllFilters } = useFilter(appliedFilter, categorySurface)

      resetAllFilters()

      const path = mocks.routerVisit.mock.calls[0]![0] as string
      expect(path).toMatch(/^\/de\/c\/shoes(\?)?$/)
      expect(path).not.toContain('filters%5B')
    })

    it('shows all_filters_cleared toast once the reload landed', () => {
      setUrl('/c/shoes?sort=price_asc&filters[color]=1')
      const appliedFilter = createAppliedFilters()
      const { resetAllFilters } = useFilter(appliedFilter, categorySurface)

      resetAllFilters()
      expect(mocks.toastShow).not.toHaveBeenCalled()
      succeedLastVisit({})

      expect(mocks.toastShow).toHaveBeenCalledTimes(1)
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'filter.notification.all_filters_cleared',
        { type: 'SUCCESS' },
      )
    })

    it('does not navigate or show a toast when no filter is applied', () => {
      setUrl('/search?filters[term]=shoes&sort=price_asc')
      const { resetAllFilters } = useFilter(
        createAppliedFilters(),
        categorySurface,
      )

      resetAllFilters()

      expect(mocks.routerVisit).not.toHaveBeenCalled()
      expect(mocks.toastShow).not.toHaveBeenCalled()
    })

    it('preserves the search term when resetting all filters', () => {
      setUrl('/search?filters[term]=shoes&filters[color]=1&page=2')
      const appliedFilter = createAppliedFilters({
        term: 'shoes',
        attributes: { color: ['1'] },
        count: 1,
      })
      const { resetAllFilters } = useFilter(appliedFilter, categorySurface)

      resetAllFilters()

      expect(mocks.routerVisit).toHaveBeenCalledTimes(1)
      const path = mocks.routerVisit.mock.calls[0]![0] as string
      expect(path).toContain('filters%5Bterm%5D=shoes')
      // cspell:disable-next-line -- `%5Bcolor%5D` tokenizes as "Bcolor"
      expect(path).not.toContain('filters%5Bcolor%5D')
      expect(path).not.toContain('page=')
    })
  })

  describe('onSlideInClose', () => {
    it('shows filter_and_sort_updated when filters and sort both changed', () => {
      const appliedFilter = createAppliedFilters()
      const { applyFilter, onSlideInOpen, onSlideInClose } = useFilter(
        appliedFilter,
        categorySurface,
      )

      onSlideInOpen()
      applyFilter(
        new URLSearchParams({ sort: 'price_desc', 'filters[minPrice]': '10' }),
      )
      succeedLastVisit({})
      setUrl('/c/shoes?sort=price_desc&filters[minPrice]=10')
      onSlideInClose()

      expect(mocks.toastShow).toHaveBeenCalledTimes(1)
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'filter.notification.filter_and_sort_updated',
        { type: 'SUCCESS' },
      )
    })

    it('shows filter_updated when only filters changed', () => {
      const appliedFilter = createAppliedFilters()
      const { applyFilter, onSlideInClose } = useFilter(
        appliedFilter,
        categorySurface,
      )

      applyFilter(
        new URLSearchParams({ sort: 'price_asc', 'filters[minPrice]': '10' }),
      )
      succeedLastVisit({})
      setUrl('/c/shoes?sort=price_asc&filters[minPrice]=10')
      onSlideInClose()

      expect(mocks.toastShow).toHaveBeenCalledTimes(1)
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'filter.notification.filter_updated',
        { type: 'SUCCESS' },
      )
    })

    it.for(['onHttpException', 'onNetworkError'] as const)(
      'shows no toast on close after the filter reload failed with %s',
      (callback) => {
        const { applyFilter, onSlideInClose } = useFilter(
          createAppliedFilters(),
          categorySurface,
        )

        applyFilter(
          new URLSearchParams({ sort: 'price_asc', 'filters[minPrice]': '10' }),
        )
        failLastVisit(callback)
        onSlideInClose()

        expect(mocks.toastShow).not.toHaveBeenCalled()
      },
    )

    it.for(['onHttpException', 'onNetworkError'] as const)(
      'leaves the error toast to the global listener after %s',
      (callback) => {
        const { applyFilter } = useFilter(
          createAppliedFilters(),
          categorySurface,
        )

        applyFilter(new URLSearchParams({ 'filters[minPrice]': '10' }))

        expect(failLastVisit(callback)).toBeUndefined()
      },
    )

    it('shows no toast on the next close when the previous close came before the reload landed', () => {
      const { applyFilter, onSlideInClose } = useFilter(
        createAppliedFilters(),
        categorySurface,
      )

      applyFilter(
        new URLSearchParams({ sort: 'price_asc', 'filters[minPrice]': '10' }),
      )
      onSlideInClose()
      succeedLastVisit({})
      mocks.toastShow.mockClear()
      onSlideInClose()

      expect(mocks.toastShow).not.toHaveBeenCalled()
    })

    it('shows sort_updated when only sort changed', () => {
      const appliedFilter = createAppliedFilters()
      const { onSlideInOpen, onSlideInClose } = useFilter(
        appliedFilter,
        categorySurface,
      )

      onSlideInOpen()
      setUrl('/c/shoes?sort=price_desc')
      onSlideInClose()

      expect(mocks.toastShow).toHaveBeenCalledTimes(1)
      expect(mocks.toastShow).toHaveBeenCalledWith(
        'filter.notification.sort_updated',
        { type: 'SUCCESS' },
      )
    })

    it('does not show toast when neither filters nor sort changed', () => {
      const appliedFilter = createAppliedFilters()
      const { onSlideInClose } = useFilter(appliedFilter, categorySurface)

      onSlideInClose()

      expect(mocks.toastShow).not.toHaveBeenCalled()
    })

    it('does not show sort_updated when the sort changed before the slide-in opened', () => {
      const { onSlideInOpen, onSlideInClose } = useFilter(
        createAppliedFilters(),
        categorySurface,
      )

      setUrl('/c/shoes?sort=price_desc')
      onSlideInOpen()
      onSlideInClose()

      expect(mocks.toastShow).not.toHaveBeenCalled()
    })
  })
})

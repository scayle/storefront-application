import { describe, expect, it, vi } from 'vitest'
import { createSafeFailure, createSafeSuccess } from '@test/utils/orpc'
import { useSearch } from './useSearch'

const mocks = vi.hoisted(() => ({
  getSuggestions: vi.fn(),
  resolve: vi.fn(),
}))

vi.mock('./useRpcClient', () => ({
  useRpcClient: () => ({
    search: {
      getSuggestions: mocks.getSuggestions,
      resolve: mocks.resolve,
    },
  }),
}))

describe('useSearch', () => {
  it('initializes with empty state', () => {
    const { searchQuery, suggestions, status, hasSuggestions } = useSearch()

    expect(searchQuery.value).toBe('')
    expect(status.value).toBe('idle')
    expect(hasSuggestions.value).toBe(false)
    expect(suggestions.value).toEqual({
      categories: [],
      products: [],
      navigationItems: [],
      showAllResultsLink: '',
    })
  })

  describe('getSearchSuggestions', () => {
    it('does nothing when searchQuery is empty', async () => {
      const { getSearchSuggestions, status } = useSearch()

      await getSearchSuggestions()

      expect(mocks.getSuggestions).not.toHaveBeenCalled()
      expect(status.value).toBe('idle')
    })

    it('fetches suggestions and updates state on success', async () => {
      const mockData = {
        categories: [{ id: 1, name: 'Shoes', link: '/c/shoes-1', filters: [] }],
        products: [],
        navigationItems: [],
        showAllResultsLink: '/search?filters[term]=shoes',
      }
      mocks.getSuggestions.mockResolvedValue(createSafeSuccess(mockData))

      const {
        searchQuery,
        getSearchSuggestions,
        suggestions,
        status,
        categories,
      } = useSearch()

      searchQuery.value = 'shoes'
      await getSearchSuggestions()

      expect(mocks.getSuggestions).toHaveBeenCalledWith(
        { term: 'shoes' },
        { signal: expect.any(AbortSignal) },
      )
      expect(suggestions.value).toEqual(mockData)
      expect(status.value).toBe('success')
      expect(categories.value).toHaveLength(1)
    })

    it('keeps the previous suggestions object while a new request is pending', async () => {
      mocks.getSuggestions.mockResolvedValueOnce(
        createSafeSuccess({
          categories: [
            { id: 1, name: 'Shoes', link: '/c/shoes-1', filters: [] },
          ],
          products: [],
          navigationItems: [],
          showAllResultsLink: '/search?filters[term]=shoes',
        }),
      )
      const { searchQuery, getSearchSuggestions, suggestions, status } =
        useSearch()
      searchQuery.value = 'shoes'
      await getSearchSuggestions()
      const reported = suggestions.value

      // The second request never settles within this test.
      mocks.getSuggestions.mockReturnValueOnce(new Promise(() => {}))
      searchQuery.value = 'shoes red'
      void getSearchSuggestions()

      // `SFSearchField` keys its suggestion view events on this object, so a
      // loader that cleared it would report the same rows twice.
      expect(status.value).toBe('pending')
      expect(suggestions.value).toBe(reported)
    })

    it('sets status to error on failure', async () => {
      mocks.getSuggestions.mockResolvedValue(
        createSafeFailure(new Error('Network error')),
      )

      const { searchQuery, getSearchSuggestions, status } = useSearch()

      searchQuery.value = 'shoes'
      await getSearchSuggestions()

      expect(status.value).toBe('error')
    })

    it('resets suggestions when searchQuery is cleared', async () => {
      const mockData = {
        categories: [{ id: 1, name: 'Shoes', link: '/c/shoes-1', filters: [] }],
        products: [],
        navigationItems: [],
        showAllResultsLink: '/search?filters[term]=shoes',
      }
      mocks.getSuggestions.mockResolvedValue(createSafeSuccess(mockData))

      const { searchQuery, getSearchSuggestions, suggestions, status } =
        useSearch()

      searchQuery.value = 'shoes'
      await getSearchSuggestions()
      expect(suggestions.value.categories).toHaveLength(1)

      searchQuery.value = ''
      await getSearchSuggestions()

      expect(suggestions.value).toEqual({
        categories: [],
        products: [],
        navigationItems: [],
        showAllResultsLink: '',
      })
      expect(status.value).toBe('idle')
    })

    it.for([
      {
        group: 'categories',
        suggestions: {
          categories: [
            { id: 1, name: 'Shoes', link: '/c/shoes-1', filters: [] },
          ],
          products: [],
          navigationItems: [],
        },
      },
      {
        group: 'products',
        suggestions: {
          categories: [],
          products: [{ product: { id: 1 } }],
          navigationItems: [],
        },
      },
      {
        group: 'navigationItems',
        suggestions: {
          categories: [],
          products: [],
          navigationItems: [{ id: 5, name: 'Nav', link: '/nav' }],
        },
      },
    ])(
      'reports suggestions when only the $group group is populated',
      async ({ suggestions: partial }) => {
        mocks.getSuggestions.mockResolvedValue(
          createSafeSuccess({
            ...partial,
            showAllResultsLink: '/search?filters[term]=shoes',
          }),
        )

        const { searchQuery, getSearchSuggestions, hasSuggestions } =
          useSearch()

        searchQuery.value = 'shoes'
        await getSearchSuggestions()

        expect(hasSuggestions.value).toBe(true)
      },
    )
  })

  describe('resolveSearch', () => {
    it('returns null when searchQuery is empty', async () => {
      const { resolveSearch } = useSearch()

      const result = await resolveSearch()

      expect(result).toBeNull()
      expect(mocks.resolve).not.toHaveBeenCalled()
    })

    it('returns resolve result on success', async () => {
      const mockResult = { result: { type: 'category', link: '/c/shoes-1' } }
      mocks.resolve.mockResolvedValue(createSafeSuccess(mockResult))

      const { searchQuery, resolveSearch } = useSearch()

      searchQuery.value = 'shoes'
      const result = await resolveSearch()

      expect(mocks.resolve).toHaveBeenCalledWith({ term: 'shoes' })
      expect(result).toEqual({ type: 'category', link: '/c/shoes-1' })
    })

    it('returns null on error', async () => {
      mocks.resolve.mockResolvedValue(
        createSafeFailure(new Error('Network error')),
      )

      const { searchQuery, resolveSearch } = useSearch()

      searchQuery.value = 'shoes'
      const result = await resolveSearch()

      expect(result).toBeNull()
    })
  })

  describe('resetSearch', () => {
    it('resets all state', async () => {
      mocks.getSuggestions.mockResolvedValue(
        createSafeSuccess({
          categories: [
            { id: 1, name: 'Shoes', link: '/c/shoes-1', filters: [] },
          ],
          products: [],
          navigationItems: [],
          showAllResultsLink: '/search?filters[term]=shoes',
        }),
      )

      const {
        searchQuery,
        getSearchSuggestions,
        resetSearch,
        suggestions,
        status,
      } = useSearch()

      searchQuery.value = 'shoes'
      await getSearchSuggestions()
      expect(status.value).toBe('success')

      resetSearch()

      expect(searchQuery.value).toBe('')
      expect(status.value).toBe('idle')
      expect(suggestions.value).toEqual({
        categories: [],
        products: [],
        navigationItems: [],
        showAllResultsLink: '',
      })
    })
  })

  describe('request cancellation', () => {
    const suggestionsPayload = {
      categories: [{ id: 1, name: 'Shoes', link: '/c/shoes-1', filters: [] }],
      products: [],
      navigationItems: [],
      showAllResultsLink: '/search?filters[term]=shoes',
    }

    it('aborts the in-flight request when a second search starts', async () => {
      const signals: AbortSignal[] = []
      let settleFirst!: (result: unknown) => void

      mocks.getSuggestions
        .mockImplementationOnce(
          (_input: unknown, { signal }: { signal: AbortSignal }) => {
            signals.push(signal)
            return new Promise((resolve) => {
              settleFirst = resolve
            })
          },
        )
        .mockImplementationOnce(
          (_input: unknown, { signal }: { signal: AbortSignal }) => {
            signals.push(signal)
            return Promise.resolve(createSafeSuccess(suggestionsPayload))
          },
        )

      const { searchQuery, getSearchSuggestions, status, categories } =
        useSearch()
      searchQuery.value = 'shoes'

      const first = getSearchSuggestions()
      const second = getSearchSuggestions()

      expect(signals[0]!.aborted).toBe(true)
      expect(signals[1]!.aborted).toBe(false)

      settleFirst(createSafeFailure(new Error('aborted')))
      await Promise.all([first, second])

      expect(status.value).toBe('success')
      expect(categories.value).toHaveLength(1)
    })

    it('swallows the failure of an aborted request instead of reporting it', async () => {
      let settleFirst!: (result: unknown) => void

      mocks.getSuggestions
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              settleFirst = resolve
            }),
        )
        // The replacement request stays in flight for the rest of the test.
        .mockImplementationOnce(() => new Promise(() => {}))

      const { searchQuery, getSearchSuggestions, status } = useSearch()
      searchQuery.value = 'shoes'

      const first = getSearchSuggestions()
      void getSearchSuggestions()

      settleFirst(createSafeFailure(new Error('aborted')))
      await first

      // The dropdown keeps its loader instead of flashing an error the user
      // never caused.
      expect(status.value).toBe('pending')
    })

    it('aborts the in-flight request when the query is cleared', async () => {
      let signal!: AbortSignal
      mocks.getSuggestions.mockImplementationOnce(
        (_input: unknown, options: { signal: AbortSignal }) => {
          signal = options.signal
          return new Promise(() => {})
        },
      )

      const { searchQuery, getSearchSuggestions, status } = useSearch()
      searchQuery.value = 'shoes'
      void getSearchSuggestions()

      searchQuery.value = ''
      await getSearchSuggestions()

      expect(signal.aborted).toBe(true)
      expect(status.value).toBe('idle')
      expect(mocks.getSuggestions).toHaveBeenCalledTimes(1)
    })

    it('ignores a response whose term is no longer the current query', async () => {
      let settleFirst!: (result: unknown) => void
      mocks.getSuggestions.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            settleFirst = resolve
          }),
      )

      const { searchQuery, getSearchSuggestions, suggestions, status } =
        useSearch()
      searchQuery.value = 'shoes'
      const first = getSearchSuggestions()

      searchQuery.value = 'boots'
      settleFirst(createSafeSuccess(suggestionsPayload))
      await first

      expect(suggestions.value.categories).toHaveLength(0)
      expect(status.value).toBe('pending')
    })
  })
})

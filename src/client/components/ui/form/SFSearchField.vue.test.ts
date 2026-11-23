import { flushPromises, mount } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { GroupedSearchSuggestions } from '@scayle/storefront/types'
import {
  createMockCategorySuggestion,
  createMockNavigationItemSuggestion,
  createMockProductSuggestion,
} from '@test/mock-data/search'
import { t } from '@test/mocks/vue-i18n'
import SFSearchField from './SFSearchField.vue'

// Plain spies shared between the mock factories and the assertions.
const {
  getSearchSuggestions,
  resetSearch,
  navigate,
  clickOutside,
  resolveSearch,
  trackSearchOutcome,
  trackViewSearchSuggestions,
  trackSelectSearchSuggestion,
} = vi.hoisted(() => ({
  getSearchSuggestions: vi.fn(),
  resetSearch: vi.fn(),
  navigate: vi.fn(),
  // Captures the callback passed to `onClickOutside` so a test can invoke it.
  clickOutside: { handler: undefined as (() => void) | undefined },
  resolveSearch: vi.fn(),
  trackSearchOutcome: vi.fn(),
  trackViewSearchSuggestions: vi.fn(),
  trackSelectSearchSuggestion: vi.fn(),
}))

const emptySuggestions: GroupedSearchSuggestions = {
  categories: [],
  products: [],
  navigationItems: [],
  showAllResultsLink: '',
}

// Reactive search state the mocked `useSearch` hands to the component. Tests
// replace `suggestions.value` the way a `getSearchSuggestions` result does.
const searchState = vi.hoisted(() => ({
  suggestions: undefined as { value: GroupedSearchSuggestions } | undefined,
  searchQuery: undefined as { value: string } | undefined,
  status: undefined as { value: string } | undefined,
}))

vi.mock('@client/composables/useSearch', async () => {
  const { computed, ref } = await import('vue')
  const searchQuery = ref('')
  const suggestions = ref<GroupedSearchSuggestions>({
    categories: [],
    products: [],
    navigationItems: [],
    showAllResultsLink: '',
  })
  const status = ref('idle')
  searchState.suggestions = suggestions
  searchState.searchQuery = searchQuery
  searchState.status = status
  return {
    useSearch: () => ({
      searchQuery,
      getSearchSuggestions,
      resetSearch,
      suggestions,
      products: computed(() => suggestions.value.products),
      categories: computed(() => suggestions.value.categories),
      navigationItems: computed(() => suggestions.value.navigationItems),
      showAllResultsLink: computed(() => suggestions.value.showAllResultsLink),
      hasSuggestions: computed(
        () =>
          suggestions.value.products.length > 0 ||
          suggestions.value.categories.length > 0 ||
          suggestions.value.navigationItems.length > 0,
      ),
      status,
      resolveSearch,
    }),
  }
})

// `useSearchSuggestionNavigation` stays real: the Enter path hands its
// `activeSuggestion` to the tracking call together with its `entries`, and the
// position is resolved by identity between the two.
vi.mock('@client/composables/tracking/useSearchEvents', () => ({
  useSearchEvents: () => ({
    trackSearchOutcome,
    trackViewSearchSuggestions,
    trackSelectSearchSuggestion,
  }),
}))

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({ navigate }),
}))

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useDebounceFn: (fn: () => void) => fn,
  // Run the deferred hide-check callback synchronously so its focus logic is
  // exercised; the real timer only defers it to the next macrotask.
  useTimeoutFn: (callback: () => void) => ({
    start: () => callback(),
    stop: vi.fn(),
  }),
  onClickOutside: vi.fn((_target, handler: () => void) => {
    clickOutside.handler = handler
  }),
}))

vi.mock('@assets/icons/utility/search.svg', () => ({
  default: { template: '<svg />' },
}))

const ResultsContainerStub = {
  template: '<div data-testid="search-results" />',
}

const mountField = () =>
  mount(SFSearchField, {
    global: {
      mocks: { $t: t },
      stubs: {
        SFSearchResultsContainer: ResultsContainerStub,
        SFButton: { template: '<button><slot /></button>' },
      },
    },
  })

// Mounts the field with the real `SFSearchResultsContainer`, stubbing only
// `SFLink` and `SFButton`. The stubbed `mountField` cannot cover what a click
// sends: the object the container emits has to be the same one the flattened
// entries list wraps.
const mountFieldWithRealContainer = () =>
  mount(SFSearchField, {
    global: {
      mocks: { $t: t },
      stubs: {
        SFLink: {
          template: '<a :href="to"><slot /></a>',
          props: ['to', 'raw', 'variant', 'target'],
        },
        SFButton: { template: '<button><slot /></button>' },
      },
    },
  })

// Overrides `document.activeElement` (a prototype getter) for one assertion,
// returning a restore function that reinstates the native getter.
const stubActiveElement = (element: Element | null) => {
  Object.defineProperty(document, 'activeElement', {
    configurable: true,
    get: () => element,
  })
  return () => Reflect.deleteProperty(document, 'activeElement')
}

const category = createMockCategorySuggestion({ id: 5 })
const product = createMockProductSuggestion()
const navigationItem = createMockNavigationItemSuggestion({ id: 7 })
const grouped = (): GroupedSearchSuggestions => ({
  categories: [category],
  products: [product],
  navigationItems: [navigationItem],
  showAllResultsLink: '/search?filters[term]=shoes',
})
const entries = [
  { type: 'category', item: category },
  { type: 'product', item: product },
  { type: 'navigationItem', item: navigationItem },
]

const pressArrowDown = async (
  input: Pick<DOMWrapper<Element>, 'trigger'>,
  times = 1,
) => {
  for (let i = 0; i < times; i++) {
    await input.trigger('keydown', { key: 'ArrowDown' })
  }
}

describe('SFSearchField', () => {
  beforeEach(() => {
    resolveSearch.mockReset()
    searchState.suggestions!.value = { ...emptySuggestions }
    searchState.searchQuery!.value = ''
    searchState.status!.value = 'idle'
  })

  describe('SCAYLE Analytics', () => {
    it('tracks the suggestions once when the dropdown opens', async () => {
      searchState.suggestions!.value = grouped()
      const wrapper = mountField()

      await wrapper.get('[data-testid="header-search-input"]').setValue('shoes')

      expect(trackViewSearchSuggestions).toHaveBeenCalledTimes(1)
      expect(trackViewSearchSuggestions).toHaveBeenCalledWith(entries, 'shoes')
    })

    it('tracks again when a new result replaces the suggestions while the dropdown is open', async () => {
      searchState.suggestions!.value = grouped()
      const wrapper = mountField()
      await wrapper.get('[data-testid="header-search-input"]').setValue('shoes')

      searchState.suggestions!.value = grouped()
      await nextTick()

      expect(trackViewSearchSuggestions).toHaveBeenCalledTimes(2)
    })

    it('does not track again when the dropdown reopens on the result already reported', async () => {
      searchState.suggestions!.value = grouped()
      const wrapper = mountField()
      const input = wrapper.get('[data-testid="header-search-input"]')
      await input.setValue('shoes')

      await input.trigger('keydown', { key: 'Escape' })
      await input.trigger('focus')

      expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(true)
      expect(trackViewSearchSuggestions).toHaveBeenCalledTimes(1)
    })

    it('does not track a result that lands while the dropdown is closed', async () => {
      searchState.suggestions!.value = grouped()
      const wrapper = mountField()
      const input = wrapper.get('[data-testid="header-search-input"]')
      await input.setValue('shoes')

      await input.trigger('keydown', { key: 'Escape' })
      searchState.suggestions!.value = grouped()
      await nextTick()

      expect(trackViewSearchSuggestions).toHaveBeenCalledTimes(1)
    })

    it('tracks nothing for an empty suggestions result', async () => {
      const wrapper = mountField()
      const input = wrapper.get('[data-testid="header-search-input"]')

      await input.setValue('shoes')
      searchState.suggestions!.value = { ...emptySuggestions }
      await nextTick()

      expect(trackViewSearchSuggestions).not.toHaveBeenCalled()
    })

    it('does not track a select for a click on "show all" but still closes the search', async () => {
      searchState.suggestions!.value = grouped()
      const wrapper = mountFieldWithRealContainer()
      await wrapper.get('[data-testid="header-search-input"]').setValue('shoes')
      await vi.dynamicImportSettled()
      await flushPromises()

      await wrapper.get('[data-testid="display-all-results"]').trigger('click')

      expect(trackSelectSearchSuggestion).not.toHaveBeenCalled()
      expect(resetSearch).toHaveBeenCalledTimes(1)
    })

    it('tracks a click on a suggestion rendered by the real results container', async () => {
      searchState.suggestions!.value = grouped()
      const wrapper = mountFieldWithRealContainer()
      await wrapper.get('[data-testid="header-search-input"]').setValue('shoes')
      await vi.dynamicImportSettled()
      await flushPromises()

      // Second row: the product, the branch most likely to emit a nested
      // object instead of the suggestion itself.
      await wrapper
        .findAll('[data-testid="search-suggestions-item"]')[1]!
        .trigger('click')

      expect(trackSelectSearchSuggestion).toHaveBeenCalledWith(
        entries[1],
        entries,
        'shoes',
      )
      const [entry, list] = trackSelectSearchSuggestion.mock.calls[0]!
      expect(list).toContain(entry)
    })

    it('tracks the keyboard-selected suggestion as an entry of the dropdown list on Enter', async () => {
      searchState.suggestions!.value = grouped()
      const wrapper = mountField()
      const input = wrapper.get('[data-testid="header-search-input"]')
      await input.setValue('shoes')
      // Second row: the product.
      await pressArrowDown(input, 2)

      await input.trigger('keydown', { key: 'Enter' })

      expect(trackSelectSearchSuggestion).toHaveBeenCalledWith(
        entries[1],
        entries,
        'shoes',
      )
      // `activeSuggestion` comes from the same list the position is read from;
      // two separately flattened lists would make this `-1`.
      const [entry, list] = trackSelectSearchSuggestion.mock.calls[0]!
      expect(list.indexOf(entry)).toBe(1)
      expect(navigate).toHaveBeenCalledWith(product.product.link)
      expect(
        trackSelectSearchSuggestion.mock.invocationCallOrder[0],
      ).toBeLessThan(navigate.mock.invocationCallOrder[0]!)
    })

    it('does not track a select for Enter on the "show all" row', async () => {
      searchState.suggestions!.value = grouped()
      const wrapper = mountField()
      const input = wrapper.get('[data-testid="header-search-input"]')
      await input.setValue('shoes')
      // Past the three suggestions onto the trailing "show all" row.
      await pressArrowDown(input, entries.length + 1)

      await input.trigger('keydown', { key: 'Enter' })

      expect(trackSelectSearchSuggestion).not.toHaveBeenCalled()
      expect(navigate).toHaveBeenCalledWith('/search?filters[term]=shoes')
    })

    it('reports a resolved search as the search outcome before navigating', async () => {
      const resolved = {
        type: 'category',
        id: 5,
        link: '/c/shoes-5',
        filters: [],
      }
      resolveSearch.mockResolvedValue(resolved)
      const wrapper = mountField()
      await wrapper.get('[data-testid="header-search-input"]').setValue('shoes')

      await wrapper.get('[data-testid="search-form"]').trigger('submit')
      await flushPromises()

      expect(trackSearchOutcome).toHaveBeenCalledWith('shoes', resolved)
      expect(navigate).toHaveBeenCalledWith('/c/shoes-5')
    })

    it('neither resolves nor navigates on a submit with an empty field', async () => {
      const wrapper = mountField()

      await wrapper.find('form').trigger('submit')

      expect(resolveSearch).not.toHaveBeenCalled()
      expect(navigate).not.toHaveBeenCalled()
      expect(trackSearchOutcome).not.toHaveBeenCalled()
    })

    it('leaves the search outcome to the results page when the term does not resolve', async () => {
      resolveSearch.mockResolvedValue(null)
      searchState.suggestions!.value = grouped()
      const wrapper = mountField()
      await wrapper.get('[data-testid="header-search-input"]').setValue('shoes')

      await wrapper.get('[data-testid="search-form"]').trigger('submit')
      await flushPromises()

      expect(trackSearchOutcome).not.toHaveBeenCalled()
      expect(navigate).toHaveBeenCalledWith('/search?filters[term]=shoes')
    })
  })

  it('fetches suggestions as the user types', async () => {
    const wrapper = mountField()

    await wrapper.get('[data-testid="header-search-input"]').setValue('shoes')

    expect(getSearchSuggestions).toHaveBeenCalledTimes(1)
  })

  it.for([
    { query: 'sh', open: false },
    { query: 'sho', open: true },
  ])(
    'opens the dropdown from the third character (open: $open for "$query")',
    async ({ query, open }) => {
      const wrapper = mountField()
      const input = wrapper.get('[data-testid="header-search-input"]')

      await input.setValue(query)

      expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(open)
      expect(input.attributes('aria-expanded')).toBe(String(open))
    },
  )

  it('shows the loader while the first suggestions are loading', async () => {
    searchState.status!.value = 'pending'
    const wrapper = mountFieldWithRealContainer()

    await wrapper.get('[data-testid="header-search-input"]').setValue('shoes')

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)
  })

  it.for([
    {
      status: 'pending',
      count: 0,
      announcement: 'global.search_results_loading',
    },
    { status: 'success', count: 0, announcement: 'global.search_no_results' },
    {
      status: 'success',
      count: 3,
      announcement: 'global.search_results_count({"count":3})',
    },
  ])(
    'announces $announcement for a $status search with $count suggestions',
    ({ status, count, announcement }) => {
      searchState.status!.value = status
      searchState.suggestions!.value = count ? grouped() : emptySuggestions
      const wrapper = mountField()

      expect(wrapper.get('[role="status"]').text()).toBe(announcement)
    },
  )

  it('handles Escape in two steps: first dismisses the listbox keeping the query, second clears it', async () => {
    const wrapper = mountField()
    const input = wrapper.get('[data-testid="header-search-input"]')

    // Typing ≥3 chars + focus opens the listbox.
    await input.setValue('shoes')
    expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(true)

    // First Escape: listbox closes, the query is kept, nothing is cleared.
    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(false)
    expect((input.element as HTMLInputElement).value).toBe('shoes')
    expect(resetSearch).not.toHaveBeenCalled()

    // Second Escape (listbox already closed): clears the query.
    await input.trigger('keydown', { key: 'Escape' })
    expect(resetSearch).toHaveBeenCalledTimes(1)
  })

  it('closes the listbox and drops the active suggestion on a pointer interaction outside the field', async () => {
    searchState.suggestions!.value = grouped()
    const wrapper = mountField()
    const input = wrapper.get('[data-testid="header-search-input"]')

    await input.setValue('shoes')
    expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(true)
    await pressArrowDown(input)
    expect(input.attributes('aria-activedescendant')).toBe(
      `search-result-category-${category.id}`,
    )

    // Invoke the callback the component registered with `onClickOutside`.
    clickOutside.handler?.()
    await nextTick()

    expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(false)
    expect(input.attributes('aria-activedescendant')).toBeUndefined()
  })

  it('keeps the listbox open when the keyboard is dismissed (blur to <body>)', async () => {
    const wrapper = mountField()
    const input = wrapper.get('[data-testid="header-search-input"]')

    await input.setValue('shoes')
    expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(true)

    // iOS Safari dismisses the on-screen keyboard by blurring the input to
    // <body> with no new focus target — the listbox must stay open.
    const restore = stubActiveElement(document.body)
    await input.trigger('focusout')
    await nextTick()
    restore()

    expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(true)
  })

  it('closes the listbox when focus moves to an element outside the field', async () => {
    const wrapper = mountField()
    const input = wrapper.get('[data-testid="header-search-input"]')

    await input.setValue('shoes')
    expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(true)

    const restore = stubActiveElement(document.createElement('button'))
    await input.trigger('focusout')
    await nextTick()
    restore()

    expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(false)
  })
})

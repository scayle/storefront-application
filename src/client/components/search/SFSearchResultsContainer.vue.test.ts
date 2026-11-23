import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  createMockCategorySuggestion,
  createMockProductSuggestion,
  createMockNavigationItemSuggestion,
} from '../../../test/mock-data/search'
import SFSearchResultsContainer from './SFSearchResultsContainer.vue'

const SFLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to', 'raw', 'variant', 'target'],
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const category = createMockCategorySuggestion()
const product = createMockProductSuggestion()
const navigationItem = createMockNavigationItemSuggestion()

const defaultProps = {
  searchQuery: 'Test',
  products: [] as (typeof product)[],
  categories: [] as (typeof category)[],
  navigationItems: [] as (typeof navigationItem)[],
  showSuggestionsLoader: false,
  showAllResultsLink: '/search?filters[term]=Test',
}

describe('SFSearchResultsContainer', () => {
  it('renders skeleton loader when loading', () => {
    const wrapper = mount(SFSearchResultsContainer, {
      props: { ...defaultProps, showSuggestionsLoader: true },
      global: {
        stubs: {
          SFLink: SFLinkStub,
          SFShowAllResultsLink: { template: '<div><slot /></div>' },
        },
        mocks: { $t: (k: string) => k },
      },
    })

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="no-result"]').exists()).toBe(false)
    expect(
      wrapper.findAll('[data-testid="search-suggestions-item"]'),
    ).toHaveLength(0)
  })

  it('renders no-result section when there are no suggestions', () => {
    const wrapper = mount(SFSearchResultsContainer, {
      props: defaultProps,
      global: {
        stubs: {
          SFLink: SFLinkStub,
          SFShowAllResultsLink: { template: '<div><slot /></div>' },
        },
        mocks: { $t: (k: string) => k },
      },
    })

    expect(wrapper.find('[data-testid="no-result"]').exists()).toBe(true)
  })

  it('keeps showing suggestions instead of skeleton while refetching', () => {
    const wrapper = mount(SFSearchResultsContainer, {
      props: {
        ...defaultProps,
        showSuggestionsLoader: true,
        categories: [createMockCategorySuggestion()],
      },
      global: {
        stubs: {
          SFLink: SFLinkStub,
          SFShowAllResultsLink: { template: '<div><slot /></div>' },
        },
        mocks: { $t: (k: string) => k },
      },
    })

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(
      wrapper.findAll('[data-testid="search-suggestions-item"]'),
    ).toHaveLength(1)
  })

  it('renders suggestions when available', () => {
    const wrapper = mount(SFSearchResultsContainer, {
      props: {
        ...defaultProps,
        categories: [createMockCategorySuggestion()],
        products: [createMockProductSuggestion()],
        navigationItems: [createMockNavigationItemSuggestion()],
      },
      global: {
        stubs: {
          SFLink: SFLinkStub,
          SFShowAllResultsLink: { template: '<div><slot /></div>' },
        },
        mocks: { $t: (k: string) => k },
      },
    })

    expect(wrapper.find('[data-testid="no-result"]').exists()).toBe(false)
    expect(
      wrapper.findAll('[data-testid="search-suggestions-item"]'),
    ).toHaveLength(3)
  })

  // The three suggestion groups each carry their own `$emit('clickResult')`
  // binding, so a regression in one is independent of the other two.
  it.each<
    [
      'categories' | 'products' | 'navigationItems',
      Partial<typeof defaultProps>,
    ]
  >([
    ['categories', { categories: [category] }],
    ['products', { products: [product] }],
    ['navigationItems', { navigationItems: [navigationItem] }],
  ])(
    'emits the clicked %s suggestion object itself as clickResult',
    async (key, props) => {
      const wrapper = mount(SFSearchResultsContainer, {
        props: { ...defaultProps, ...props },
        global: {
          stubs: {
            SFLink: SFLinkStub,
            SFShowAllResultsLink: { template: '<div><slot /></div>' },
          },
          mocks: { $t: (k: string) => k },
        },
      })

      await wrapper
        .find('[data-testid="search-suggestions-item"]')
        .trigger('click')
      expect(wrapper.emitted('clickResult')).toHaveLength(1)
      // `SFSearchField` finds the tracked entry by identity, so the payload
      // has to be the prop object, not a copy.
      expect(wrapper.emitted('clickResult')![0]![0]).toBe(wrapper.props(key)[0])
    },
  )
})

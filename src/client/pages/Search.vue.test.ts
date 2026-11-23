import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SFProductGrid from '@client/components/product/SFProductGrid.vue'
import { createOverlayTestPlugin } from '@test/utils/overlay'
import type { AppliedFilters } from '@scayle/storefront/types'
import SFListingImageViewSelection from '@client/components/image-view/SFListingImageViewSelection.vue'
import SFHeadlineItemCount from '@client/components/ui/core/SFHeadlineItemCount.vue'
import SFSearchNoResults from '@client/components/product/SFSearchNoResults.vue'
import Search from './Search.vue'

const { trackSearchOutcomeMock, history } = vi.hoisted(() => ({
  trackSearchOutcomeMock: vi.fn(),
  history: {
    // What Inertia restores from the history state; `undefined` on a new visit.
    remembered: undefined as { tracked: boolean } | undefined,
    // The object the page mutates, which Inertia writes back to the history state.
    state: undefined as { tracked: boolean } | undefined,
  },
}))

vi.mock('@inertiajs/vue3', () => ({
  useRemember: (state: { tracked: boolean }) => {
    history.state = history.remembered
      ? Object.assign(state, history.remembered)
      : state
    return history.state
  },
}))

const imageViewMocks = vi.hoisted(() => ({
  selectedImageType: undefined as string | undefined,
}))

vi.mock('@client/composables/useImageView', async () => {
  const { ref } = await import('vue')
  return {
    useImageView: () => ({
      selectedImageType: ref(imageViewMocks.selectedImageType),
    }),
  }
})

vi.mock('@client/composables/tracking/useSearchEvents', () => ({
  useSearchEvents: () => ({
    trackSearchOutcome: trackSearchOutcomeMock,
  }),
}))

const overlays = createOverlayTestPlugin()

const globalConfig = {
  stubs: {
    PageMetaHead: true,
    SFProductGrid: true,
    SFFilterToggleButton: true,
    SFHeadlineItemCount: true,
    SFListingImageViewSelection: true,
  },
  mocks: { $t: (key: string) => key },
  plugins: [overlays.plugin],
}

function createProps() {
  return {
    term: 'shoes',
    products: [{ id: 1 }] as never,
    pagination: { totalItems: 64 } as never,
    meta: { title: 'Search', robots: 'noindex, nofollow' },
    appliedFilters: {
      term: 'shoes',
      attributes: {},
      booleans: {},
      count: 0,
    } as AppliedFilters,
    imageViewOptions: [] as { value: string; label: string }[],
    termRejected: false,
  }
}

describe('Search page', () => {
  beforeEach(() => {
    trackSearchOutcomeMock.mockClear()
    history.remembered = undefined
    history.state = undefined
    imageViewMocks.selectedImageType = undefined
  })

  it.for([
    { termRejected: true, hint: true, results: false },
    { termRejected: false, hint: false, results: true },
  ])(
    'shows the term hint: $hint, and the grid and count: $results, when termRejected is $termRejected',
    ({ termRejected, hint, results }) => {
      const wrapper = mount(Search, {
        props: { ...createProps(), termRejected },
        global: globalConfig,
      })

      const hintElement = wrapper.find('[data-testid="search-term-rejected"]')
      expect(hintElement.exists()).toBe(hint)
      if (hint) {
        expect(hintElement.text()).toBe('search_page.term_too_long')
      }
      expect(wrapper.findComponent(SFProductGrid).exists()).toBe(results)
      expect(wrapper.findComponent(SFHeadlineItemCount).exists()).toBe(results)
    },
  )

  it('omits the image view selector when the search has no results', () => {
    const wrapper = mount(Search, {
      props: {
        ...createProps(),
        products: [] as never,
        imageViewOptions: [{ value: 'type-a', label: 'Type A' }],
      },
      global: globalConfig,
    })

    expect(wrapper.findComponent(SFListingImageViewSelection).exists()).toBe(
      false,
    )
  })

  it('fills the grid no-results slot with the search message, not the category one', () => {
    const props = { ...createProps(), products: [] as never }
    const wrapper = mount(Search, {
      props,
      global: {
        ...globalConfig,
        stubs: {
          ...globalConfig.stubs,
          SFProductGrid: { template: '<div><slot name="no-results" /></div>' },
          SFSearchNoResults: true,
        },
      },
    })

    expect(wrapper.findComponent(SFSearchNoResults).props()).toMatchObject({
      appliedFilters: props.appliedFilters,
      productListId: 'shoes',
    })
  })

  it('passes the selected image type to the product grid', () => {
    imageViewMocks.selectedImageType = 'type-a'
    const wrapper = mount(Search, {
      props: createProps(),
      global: globalConfig,
    })

    expect(wrapper.findComponent(SFProductGrid).props('imageType')).toBe(
      'type-a',
    )
  })

  it('hands the image views to the filter slide-in for the mobile selector', () => {
    const imageViewOptions = [{ value: 'type-a', label: 'Type A' }]
    mount(Search, {
      props: { ...createProps(), imageViewOptions },
      global: globalConfig,
    })

    expect(overlays.entries()[0]?.props()).toMatchObject({ imageViewOptions })
  })

  it('trims the term before it becomes the product list id', () => {
    const wrapper = mount(Search, {
      props: { ...createProps(), term: '  shoes  ' },
      global: globalConfig,
    })

    const productListId = 'shoes'
    expect(wrapper.findComponent(SFProductGrid).props('productListId')).toBe(
      productListId,
    )
    expect(overlays.entries()[0]?.props()).toMatchObject({ productListId })
  })

  it('reports the term outcome once on mount, not again when the products reload', async () => {
    const wrapper = mount(Search, {
      props: createProps(),
      global: globalConfig,
    })

    expect(trackSearchOutcomeMock).toHaveBeenCalledTimes(1)
    expect(trackSearchOutcomeMock).toHaveBeenCalledWith('shoes', {
      type: 'term',
      link: '/search?filters[term]=shoes',
      resultCount: 64,
    })

    // A pagination or filter partial reload replaces the products prop.
    await wrapper.setProps({ products: [{ id: 2 }] as never })

    expect(trackSearchOutcomeMock).toHaveBeenCalledTimes(1)
  })

  it('does not report a rejected term as a search outcome', () => {
    mount(Search, {
      props: { ...createProps(), termRejected: true },
      global: globalConfig,
    })

    expect(trackSearchOutcomeMock).not.toHaveBeenCalled()
  })

  it('marks the outcome as reported in the remembered state, so browser back finds the flag set', () => {
    mount(Search, {
      props: createProps(),
      global: globalConfig,
    })

    expect(history.state).toEqual({ tracked: true })
  })

  it('does not report the term outcome again when browser history restores the results', () => {
    history.remembered = { tracked: true }

    mount(Search, {
      props: createProps(),
      global: globalConfig,
    })

    expect(trackSearchOutcomeMock).not.toHaveBeenCalled()
  })
})

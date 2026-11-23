import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { SEOMeta } from '@shared/types/SEO'
import { createOverlayTestPlugin } from '@test/utils/overlay'
import { createMockListingProduct } from '../../test/mock-data/products'
import ProductListing from './ProductListing.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
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

const SFProductGridStub = defineComponent({
  name: 'SFProductGrid',
  props: {
    products: { type: Array, default: () => [] },
    imageType: { type: String, default: undefined },
  },
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'product-grid',
        'data-count': String((props.products as unknown[]).length),
        'data-image-type': props.imageType,
      })
  },
})

const ProductListingPageComponentStub = defineComponent({
  name: 'ProductListingPageComponent',
  props: { contentType: { type: String, default: 'teaser' } },
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'plp-cms-teaser',
        'data-content-type': props.contentType,
      })
  },
})

const overlays = createOverlayTestPlugin()

const globalConfig = {
  plugins: [overlays.plugin],
  stubs: {
    SFProductGrid: SFProductGridStub,
    ProductListingPageComponent: ProductListingPageComponentStub,
    SFCategoryTreeNavigation: true,
    SFCategoryListNavigation: true,
    SFCategoryBreadcrumbs: true,
    SFCategoryHeadline: true,
    SFBackButton: true,
    SFFilterToggleButton: true,
    SFSortSelection: true,
    SFListingImageViewSelection: true,
    SFScrollToTopButton: true,
    SFProductSliderSkeleton: true,
    ProductPageMetaHead: true,
    // ClientOnly stubbed to `true` renders nothing, keeping the Teleport (and
    // its #teleports target requirement) out of the test DOM.
    ClientOnly: true,
  },
  mocks: {
    $t: (key: string) => key,
  },
}

const category = {
  id: 10,
  name: 'Jackets',
  link: '/c/jackets',
  depth: 2,
  isSale: false,
  defaultSortingOption: { key: 'default', config: {} },
  breadcrumbs: [{ to: '/c/clothing', value: 'Clothing' }],
}

const sorting = {
  options: [{ key: 'default', config: {} }],
  selected: { key: 'default', config: {} },
  isDefaultSortSelected: true,
}

const baseProps = {
  category,
  meta: {
    title: 'Jackets',
    description: 'Browse jackets.',
    robots: 'index, follow',
  } as SEOMeta,
  listNavigationCategories: [],
  treeNavigationCategories: [],
  sorting,
  appliedFilters: { count: 0 },
  filters: [],
  products: [],
  pagination: { currentPage: 1, totalItems: 0 },
  imageViewOptions: [],
}

describe('ProductListing page', () => {
  beforeEach(() => {
    imageViewMocks.selectedImageType = undefined
  })

  it('renders the product grid with the resolved listing products', () => {
    const wrapper = mount(ProductListing, {
      // Shallow fixtures mock deep SDK types (Pagination, ProductSortConfig);
      // cast matches the Basket/Wishlist fixture-heavy baseline.
      props: {
        ...baseProps,
        products: [
          createMockListingProduct(),
          createMockListingProduct({ id: 2 }),
        ],
        pagination: { currentPage: 1, totalItems: 2 },
      } as never,
      global: globalConfig,
    })

    const grid = wrapper.get('[data-testid="product-grid"]')
    expect(grid.attributes('data-count')).toBe('2')
    expect(wrapper.find('[data-testid="plp-cms-teaser"]').exists()).toBe(false)
  })

  it('renders the CMS teaser when cmsContent is present', () => {
    const wrapper = mount(ProductListing, {
      props: {
        ...baseProps,
        cmsContent: { id: 1, content: [] },
      } as never,
      global: globalConfig,
    })

    const teaser = wrapper.get('[data-testid="plp-cms-teaser"]')
    expect(teaser.attributes('data-content-type')).toBe('teaser')
  })

  it('renders the SEO content block below the grid on the first page when cmsContent is present', () => {
    const wrapper = mount(ProductListing, {
      props: {
        ...baseProps,
        cmsContent: { id: 1, content: [] },
      } as never,
      global: globalConfig,
    })

    const blocks = wrapper
      .findAll('[data-testid="plp-cms-teaser"]')
      .map((block) => block.attributes('data-content-type'))
    expect(blocks).toEqual(['teaser', 'seo'])
  })

  it('omits the SEO content block on pages after the first', () => {
    const wrapper = mount(ProductListing, {
      props: {
        ...baseProps,
        cmsContent: { id: 1, content: [] },
        pagination: { currentPage: 2, totalItems: 0 },
      } as never,
      global: globalConfig,
    })

    const blocks = wrapper
      .findAll('[data-testid="plp-cms-teaser"]')
      .map((block) => block.attributes('data-content-type'))
    expect(blocks).toEqual(['teaser'])
  })

  it('omits the CMS teaser when no cmsContent is provided', () => {
    const wrapper = mount(ProductListing, {
      props: { ...baseProps } as never,
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="plp-cms-teaser"]').exists()).toBe(false)
  })
})

describe('ProductListing page image view', () => {
  const imageViewOptions = [{ value: 'type-a', label: 'Type A' }]

  beforeEach(() => {
    imageViewMocks.selectedImageType = undefined
  })

  it('passes the selected image type to the product grid', () => {
    imageViewMocks.selectedImageType = 'type-a'
    const wrapper = mount(ProductListing, {
      props: { ...baseProps, imageViewOptions } as never,
      global: globalConfig,
    })

    expect(
      wrapper.get('[data-testid="product-grid"]').attributes('data-image-type'),
    ).toBe('type-a')
  })

  it('hands the image views to the filter slide-in for the mobile selector', () => {
    mount(ProductListing, {
      props: { ...baseProps, imageViewOptions } as never,
      global: globalConfig,
    })

    expect(overlays.entries()[0]?.props()).toMatchObject({ imageViewOptions })
  })
})

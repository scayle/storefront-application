import type {
  StoryObj,
  ComponentPropsAndSlots,
  Meta,
} from '@storybook/vue3-vite'
import { buildPagination } from '@scayle/storefront/shared'
import type { Pagination, ListingProduct } from '@scayle/storefront/types'
import { VISIBLE_PAGE_COUNT } from '@shared/constants/pagination'
import { createMockListingProduct } from '../../../test/mock-data/products'
import SFProductGrid from './SFProductGrid.vue'

const products: ListingProduct[] = [
  createMockListingProduct({ id: 1, name: "Jacket 'Premium' Black" }),
  createMockListingProduct({
    id: 2,
    name: "Jacket 'Premium' Navy",
    link: '/products/jacket-premium-navy',
  }),
  createMockListingProduct({
    id: 3,
    name: "Jacket 'Classic'",
    link: '/products/jacket-classic',
  }),
  createMockListingProduct({
    id: 4,
    name: "Jacket 'Urban'",
    link: '/products/jacket-urban',
  }),
]

function paginationStub(
  overrides: {
    page?: number
    last?: number
    total?: number
    perPage?: number
  } = {},
): Pagination {
  const perPage = overrides.perPage ?? 8
  const last = overrides.last ?? 3
  return buildPagination({
    totalItems: overrides.total ?? 24,
    itemsPerPage: perPage,
    currentPage: overrides.page ?? 1,
    totalPageCount: last,
    visiblePageCount: VISIBLE_PAGE_COUNT,
  })
}

/**
 * SFProductGrid renders a responsive grid of product cards with optional pagination.
 * Used on category and search result pages. The "Already in basket" badge on each card
 * is driven by the useBasket composable and requires an Inertia page context to display.
 */
export default {
  title: 'Product/SFProductGrid',
  component: SFProductGrid,
  render: (args: ComponentPropsAndSlots<typeof SFProductGrid>) => ({
    components: { SFProductGrid },
    setup() {
      return { args }
    },
    template: `
      <div class="w-full max-w-6xl">
        <SFProductGrid v-bind="args" />
      </div>
    `,
  }),
  argTypes: {
    products: { control: false },
    pagination: { control: false },
  },
} satisfies Meta<typeof SFProductGrid>

type Story = StoryObj<typeof SFProductGrid>

/**
 * Grid of product cards without pagination.
 */
export const Default: Story = {
  args: {
    products,
    productListType: 'category',
    productListId: '50342',
  },
}

/**
 * Grid with pagination controls (shown when lastPage > 1).
 */
export const WithPagination: Story = {
  args: {
    products,
    pagination: paginationStub(),
    productListType: 'category',
    productListId: '50342',
  },
}

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { mocked } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type { BasketItem, ListingProduct } from '@scayle/storefront/types'
import { useAddToBasketSlideIn } from '@client/composables/useAddToBasketSlideIn'
import { createMockListingProduct } from '../../../test/mock-data/products'
import SFAddToBasketSlideIn from './SFAddToBasketSlideIn.vue'

const price = {
  finalPrice: '€130.00',
  originalPrice: '€150.00',
  finalPriceInCents: 13000,
  originalPriceInCents: 15000,
  lowestPriorPrice: { relativeDifferenceToPrice: -13, withTax: 14000 },
  strikeThroughPrices: [],
  isOnSale: true,
  showOriginally: true,
  showLowestPriorPriceLine: true,
  strikeOriginally: true,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: false,
  currency: 'EUR',
}

const addedItem = {
  key: 'item-key',
  quantity: 1,
  availableQuantity: 5,
  isLowStock: false,
  status: 'available',
  unitPrice: { ...price },
  totalPrice: { ...price, appliedReductions: [] },
  product: {
    id: 206098,
    name: "Sneaker 'Superstar Bonega'",
    link: '/p/sneaker-superstar-bonega-206098',
    brand: 'ADIDAS ORIGINALS',
    color: 'White',
    image: undefined,
    images: [],
    siblings: [],
    isSoldOut: false,
    isLowStock: false,
    isNew: false,
    sellableTimeframe: { state: 'active' },
    attributeValuesByGroup: {},
  },
  variant: { id: 1, label: '38', stock: 5, isSoldOut: false },
  customData: {},
} as unknown as BasketItem

const recommendations = Array.from({ length: 6 }, (_, index) =>
  createMockListingProduct({ id: index + 1, images: [], siblings: [] }),
)

/**
 * Confirmation panel shown after a product is added to the basket. It replaces
 * the transient toast: it names what was added, routes into the purchase funnel,
 * and offers recommendations, and it stays until dismissed.
 *
 * Open state and the confirmed line live in the `useAddToBasketSlideIn`
 * composable, so the stories below drive that composable rather than passing
 * props. The recommendations are the current page's `trendingProducts`, so the
 * stories set that page prop instead. In the application the panel is mounted
 * once in `Layout.vue` and opened by `useBasket().addItem`.
 *
 * Resize the preview across the `lg` breakpoint to compare the two layouts: a
 * right-hand panel whose upper section stays put on desktop, a bottom sheet that
 * scrolls as a whole on mobile.
 */
export default {
  title: 'Basket/SFAddToBasketSlideIn',
  component: SFAddToBasketSlideIn,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SFAddToBasketSlideIn>

type Story = StoryObj<typeof SFAddToBasketSlideIn>

const mockTrendingProducts = (trendingProducts?: ListingProduct[]) => {
  const page = usePage()
  mocked(usePage).mockReturnValue({
    ...page,
    props: { ...page.props, trendingProducts },
  })
}

const renderOpened = () => ({
  components: { SFAddToBasketSlideIn },
  setup() {
    useAddToBasketSlideIn().open(addedItem)
  },
  template: '<SFAddToBasketSlideIn />',
})

/** The panel as it appears after a successful add, with recommendations. */
export const Default: Story = {
  beforeEach() {
    mockTrendingProducts(recommendations)
  },
  render: renderOpened,
}

/**
 * The same panel with no recommendations to show: either the page's
 * `trendingProducts` are still deferred, or the add started on a page that
 * sends none at all.
 */
export const WithoutRecommendations: Story = {
  beforeEach() {
    mockTrendingProducts()
  },
  render: renderOpened,
}

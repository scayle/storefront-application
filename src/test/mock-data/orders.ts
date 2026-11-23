import type {
  ProductImage,
  Order,
  OrderItem,
  OrderDelivery,
  OrderCost,
  OrderAddresses,
  OrderPayment,
  OrderProduct,
  OrderProductVariant,
  OrderItemPrice,
  OrderStatus,
} from '@scayle/storefront/types'

/** Every `OrderStatus`, for the status select control in order stories. */
export const orderStatuses = [
  'order_open',
  'payment_pending',
  'payment_reserved',
  'invoice_completed',
  'invoice_partially_completed',
  'cancellation_completed',
  'cancellation_pending',
] satisfies OrderStatus[]

function mockProductImage(path: string): ProductImage {
  return {
    url: path,
    name: path,
    applyPadding: false,
  }
}

const defaultProduct: OrderProduct = {
  id: 101,
  name: "Jacket 'Premium'",
  brand: 'ADIDAS ORIGINALS',
  color: 'Black',
  link: '/p/jacket-premium-101',
  image: mockProductImage('product-1-big.avif'),
}

const defaultVariant: OrderProductVariant = {
  size: 'M',
}

const defaultItemPrice: OrderItemPrice = {
  finalPrice: '$49.00',
  originalPrice: '$49.00',
  currency: 'USD',
  finalPriceInCents: 4900,
  originalPriceInCents: 4900,
  strikeThroughPrices: [],
  isOnSale: false,
  showOriginally: false,
  showLowestPriorPriceLine: false,
  strikeOriginally: false,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: false,
  appliedReductions: [],
}

const saleItemPrice: OrderItemPrice = {
  finalPrice: '$39.20',
  originalPrice: '$49.00',
  currency: 'USD',
  finalPriceInCents: 3920,
  originalPriceInCents: 4900,
  strikeThroughPrices: [
    {
      value: '-20%',
      category: 'sale',
      type: 'relative',
      originalPrice: '$49.00',
    },
  ],
  isOnSale: false,
  showOriginally: false,
  showLowestPriorPriceLine: false,
  strikeOriginally: false,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: false,
  appliedReductions: [{ category: 'sale', type: 'relative', amount: '$9.80' }],
}

/** Delivery and billing render identically, so the pages merge them into one box. */
const defaultAddresses: OrderAddresses = {
  shipping: { lines: ['John Doe', '123 Main St', 'New York, 10001'] },
  billing: { lines: ['John Doe', '123 Main St', 'New York, 10001'] },
}

/** Delivery and billing differ, so the pages render a box for each. */
const separateAddresses: OrderAddresses = {
  shipping: { lines: ['John Doe', '123 Main St', 'New York, 10001'] },
  billing: { lines: ['Jane Doe', '456 Broadway', 'New York, 10002'] },
}

const defaultCost: OrderCost = {
  finalPrice: '$53.99',
  finalPriceInCents: 5399,
  subtotal: '$49.00',
  currency: 'USD',
  shippingCost: '$4.99',
  shippingCostInCents: 499,
  taxInCents: 0,
  saleReductionSumInCents: 0,
  campaignReductionSumInCents: 0,
  promotionReductionSumInCents: 0,
  includesTax: true,
}

const defaultPayment: OrderPayment[] = [{ key: 'default' }]

/**
 * Creates a mock OrderItem for stories.
 */
export function createMockOrderItem(
  overrides: Partial<OrderItem> = {},
): OrderItem {
  return {
    id: 1,
    currency: 'USD',
    packageId: 1,
    price: defaultItemPrice,
    product: defaultProduct,
    status: 'completed',
    variant: defaultVariant,
    quantity: 1,
    ...overrides,
  }
}

/**
 * Creates a mock OrderDelivery for stories.
 */
export function createMockOrderDelivery(
  overrides: Partial<OrderDelivery> = {},
): OrderDelivery {
  return {
    id: 1,
    carrierKey: 'DEFAULT',
    deliveryDate: { minimum: '25/03/2026', maximum: '28/03/2026' },
    items: [
      createMockOrderItem(),
      createMockOrderItem({
        id: 2,
        product: {
          ...defaultProduct,
          id: 102,
          name: 'Sneakers Classic',
          brand: 'NIKE',
          color: 'White',
          link: '/p/sneakers-classic-102',
          image: mockProductImage('product-2-big.avif'),
        },
        variant: { size: '42' },
        price: saleItemPrice,
      }),
    ],
    ...overrides,
  }
}

/**
 * Creates a mock Order for stories and tests.
 */
export function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 98765,
    address: defaultAddresses,
    confirmedAt: '3/23/2026',
    cost: defaultCost,
    customer: { id: 4840, isGuestCustomer: false },
    deliveries: [createMockOrderDelivery()],
    payment: defaultPayment,
    status: 'payment_reserved',
    ...overrides,
  }
}

export {
  defaultAddresses,
  separateAddresses,
  defaultCost,
  defaultPayment,
  defaultItemPrice,
  saleItemPrice,
  defaultProduct,
  defaultVariant,
}

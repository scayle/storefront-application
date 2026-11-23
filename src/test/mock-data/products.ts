import type {
  ListingProduct,
  ProductImage,
  ProductPrice,
  ProductSibling,
  ProductVariant,
  DetailedProduct,
  VariantPrice,
} from '@scayle/storefront/types'

// One factory for every product surface (listing tiles, PDP gallery, sibling
// swatches) now that images share the single `ProductImage` shape.
function productImage(path: string): ProductImage {
  return {
    url: path,
    name: path,
    applyPadding: false,
  }
}

const basePrice: ProductPrice = {
  finalPrice: '€9.99',
  currency: 'EUR',
  originalPrice: '€12.99',
  finalPriceInCents: 999,
  originalPriceInCents: 1299,
  hasDifferentPrices: false,
  isOnSale: true,
  totalReduction: '-23%',
  showOriginally: true,
  showLowestPriorPriceLine: false,
  strikeOriginally: true,
  strikeLowestPriorPrice: false,
  hasCampaignReduction: false,
  strikeThroughPrices: [],
}

const baseSiblings: ProductSibling[] = [
  {
    id: 2,
    name: "Jacket 'Premium'",
    brand: 'ADIDAS ORIGINALS',
    isSoldOut: false,
    color: 'Navy',
    link: '/products/jacket-premium-navy',
    image: productImage('product-2-big.avif'),
  },
]

/**
 * Creates mock DetailedProduct data for stories.
 * Satisfies the DetailedProduct interface used by SFSiblingSelection.
 */
export function createMockDetailedProduct(
  overrides: Partial<DetailedProduct> = {},
): DetailedProduct {
  const baseProduct: DetailedProduct = {
    id: 1,
    name: "Jacket 'Premium'",
    isSoldOut: false,
    color: 'Black',
    brand: 'ADIDAS ORIGINALS',
    referenceKey: 'HK5250-pb',
    isNew: false,
    sellableTimeframe: { state: 'active' },
    price: { ...basePrice },
    attributeValuesByGroup: {},
    details: [],
    siblings: [
      {
        id: 2,
        name: "Jacket 'Premium'",
        brand: 'ADIDAS ORIGINALS',
        isSoldOut: false,
        color: 'Navy',
        link: '/products/jacket-premium-navy',
        image: productImage('product-1-big.avif'),
      },
      {
        id: 3,
        name: "Jacket 'Premium'",
        brand: 'ADIDAS ORIGINALS',
        isSoldOut: false,
        color: 'Purple',
        link: '/products/jacket-premium-purple',
        image: productImage('product-1-big.avif'),
      },
      {
        id: 4,
        name: "Jacket 'Premium'",
        brand: 'ADIDAS ORIGINALS',
        isSoldOut: false,
        color: 'Red',
        link: '/products/jacket-premium-red',
        image: productImage('product-1-big.avif'),
      },
      {
        id: 5,
        name: "Jacket 'Premium'",
        brand: 'ADIDAS ORIGINALS',
        isSoldOut: false,
        color: 'Green',
        link: '/products/jacket-premium-green',
        image: productImage('product-1-big.avif'),
      },
      {
        id: 6,
        name: "Jacket 'Premium'",
        brand: 'ADIDAS ORIGINALS',
        isSoldOut: false,
        color: 'Yellow',
        link: '/products/jacket-premium-yellow',
        image: productImage('product-1-big.avif'),
      },
      {
        id: 7,
        name: "Jacket 'Premium'",
        brand: 'ADIDAS ORIGINALS',
        isSoldOut: false,
        color: 'Orange',
        link: '/products/jacket-premium-orange',
        image: productImage('product-1-big.avif'),
      },
      {
        id: 8,
        name: "Jacket 'Premium'",
        brand: 'ADIDAS ORIGINALS',
        isSoldOut: true,
        color: 'Pink',
        link: '/products/jacket-premium-pink',
        image: productImage('product-1-big.avif'),
      },
      {
        id: 9,
        name: "Jacket 'Premium'",
        brand: 'ADIDAS ORIGINALS',
        isSoldOut: true,
        color: 'Purple',
        link: '/products/jacket-premium-purple',
        image: productImage('product-1-big.avif'),
      },
      {
        id: 10,
        name: "Jacket 'Premium'",
        brand: 'ADIDAS ORIGINALS',
        isSoldOut: true,
        color: 'Brown',
        link: '/products/jacket-premium-brown',
        image: productImage('product-1-big.avif'),
      },
    ],
    link: '/products/jacket-premium-black',
    images: [
      productImage('product-1-big.avif'),
      productImage('product-2-big.avif'),
    ],
    breadcrumbs: [
      { to: '/', value: 'Home' },
      { to: '/categories/jackets', value: 'Jackets' },
      { to: '/products/jacket-premium-black', value: "Jacket 'Premium'" },
    ],
    variants: [
      {
        id: 1,
        label: 'M',
        stock: 10,
        isLowStock: false,
        isSoldOut: false,
        price: {
          finalPrice: '€9.99',
          originalPrice: '€12.99',
          currency: 'EUR',
          finalPriceInCents: 999,
          originalPriceInCents: 1299,
          isOnSale: true,
          totalReduction: '-23%',
          showOriginally: true,
          showLowestPriorPriceLine: false,
          strikeOriginally: true,
          strikeLowestPriorPrice: false,
          hasCampaignReduction: false,
          strikeThroughPrices: [],
        },
      },
    ],
    isLowStock: false,
    videos: [],
  }
  return { ...baseProduct, ...overrides }
}

/**
 * Creates mock ListingProduct data for stories (e.g. SFProductCard, SFProductGrid).
 * Satisfies the ListingProduct interface with images, siblings, and badges.
 */
export function createMockListingProduct(
  overrides: Partial<ListingProduct> = {},
): ListingProduct {
  const baseListing: ListingProduct = {
    id: 1,
    name: "Jacket 'Premium'",
    link: '/products/jacket-premium-black',
    brand: 'ADIDAS ORIGINALS',
    price: basePrice,
    images: [
      productImage('product-1-big.avif'),
      productImage('product-2-big.avif'),
    ],
    siblings: baseSiblings,
    isSoldOut: false,
    isLowStock: false,
    isNew: false,
    referenceKey: 'HK5250-pb',
    color: 'Black',
    sellableTimeframe: { state: 'active' },
    attributeValuesByGroup: {},
  }
  return { ...baseListing, ...overrides }
}

/**
 * Creates a mock `VariantPrice` at full price, €10.00 and not on sale. Used for
 * the price of a product variant and the unit price of a basket item.
 *
 * @param overrides Price fields merged over the defaults.
 * @returns A complete variant price.
 */
export function createMockVariantPrice(
  overrides: Partial<VariantPrice> = {},
): VariantPrice {
  return {
    finalPrice: '€10.00',
    originalPrice: '€10.00',
    finalPriceInCents: 1000,
    originalPriceInCents: 1000,
    isOnSale: false,
    showOriginally: false,
    showLowestPriorPriceLine: false,
    strikeOriginally: false,
    strikeLowestPriorPrice: false,
    strikeThroughPrices: [],
    hasCampaignReduction: false,
    currency: 'EUR',
    ...overrides,
  }
}

/**
 * Creates a mock in-stock `ProductVariant` with the label `M` and the price
 * from {@link createMockVariantPrice}. Used for size pickers and basket items.
 *
 * @param overrides Variant fields merged over the defaults.
 * @returns A complete product variant.
 */
export function createMockProductVariant(
  overrides: Partial<ProductVariant> = {},
): ProductVariant {
  return {
    id: 1,
    label: 'M',
    stock: 10,
    isLowStock: false,
    isSoldOut: false,
    price: createMockVariantPrice(),
    ...overrides,
  }
}

import { computed } from 'vue'
import type {
  SmartSortingKey,
  SmartSortingProductsSliderComponent as SmartSortingProductsSliderComponentType,
} from '@shared/types/cms/amplience'
import SmartSortingProductsSliderComponent from './SmartSortingProductsSliderComponent.vue'

interface SmartSortingStoryArgs {
  headline?: string
  smartSortingKey: SmartSortingKey
  categoryId?: number
  brandId?: number
  limit?: number
}

const SMART_SORTING_KEYS: SmartSortingKey[] = [
  'scayle:v1:sales-push',
  'scayle:v1:new-arrivals',
  'scayle:v1:balanced-offerings',
  'scayle:v1:inventory-optimization',
  'scayle:v1:luxury-promotion',
  'scayle:v1:stock-coverage',
  'scayle:v1:topseller',
  'scayle:v1:revenue-max',
  'scayle:v1:recently-popular',
  'scayle:v1:trending',
]

const createContentElement = (
  args: SmartSortingStoryArgs,
): SmartSortingProductsSliderComponentType => ({
  headline: args.headline,
  smart_sorting_key: args.smartSortingKey,
  category_id: args.categoryId,
  brand_id: args.brandId,
  limit: args.limit,
  _meta: {
    schema:
      'https://scayle.com/schemas/smart-sorting-products-slider-component.json',
  },
})

/**
 * Amplience Smart Sorting Products Slider fills a carousel from a SCAYLE smart
 * sorting algorithm rather than a hand-picked list, optionally narrowed to a
 * category or brand. The server selects the products for the chosen smart
 * sorting key. Unlike the other providers, Amplience types the numeric
 * fields as numbers, so no string parsing is needed.
 */
export default {
  title: 'CMS Amplience/SmartSortingProductsSlider',
  component: SmartSortingProductsSliderComponent,
  argTypes: {
    headline: {
      control: 'text',
      description: 'Optional headline displayed above the slider',
      name: 'contentElement.headline',
    },
    smartSortingKey: {
      control: 'select',
      options: SMART_SORTING_KEYS,
      description: 'SCAYLE smart sorting algorithm used to select products',
      name: 'contentElement.smart_sorting_key',
    },
    categoryId: {
      control: 'number',
      description: 'Optional category to narrow the selection to',
      name: 'contentElement.category_id',
    },
    brandId: {
      control: 'number',
      description: 'Optional brand to narrow the selection to',
      name: 'contentElement.brand_id',
    },
    limit: {
      control: 'number',
      description: 'Maximum number of products to display',
      name: 'contentElement.limit',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<SmartSortingProductsSliderComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: SmartSortingStoryArgs) => ({
    components: { SmartSortingProductsSliderComponent },
    setup() {
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template:
      '<Suspense><SmartSortingProductsSliderComponent :content-element="contentElement" /></Suspense>',
  }),
}

/** Best sellers across the whole assortment */
export const Topseller = {
  args: {
    headline: 'Our bestsellers',
    smartSortingKey: 'scayle:v1:topseller',
    limit: 12,
  },
}

export const NewArrivals = {
  args: {
    headline: 'Just arrived',
    smartSortingKey: 'scayle:v1:new-arrivals',
    limit: 12,
  },
}

/** Narrowed to one category, as used on a category landing page */
export const ScopedToCategory = {
  args: {
    headline: 'Trending in this category',
    smartSortingKey: 'scayle:v1:trending',
    categoryId: 100,
    limit: 8,
  },
}

/** Narrowed to one brand, as used on a brand page */
export const ScopedToBrand = {
  args: {
    headline: 'Popular from this brand',
    smartSortingKey: 'scayle:v1:recently-popular',
    brandId: 1,
    limit: 8,
  },
}

/** Without a headline, the slider sits flush with the block above it */
export const WithoutHeadline = {
  args: {
    smartSortingKey: 'scayle:v1:sales-push',
    limit: 10,
  },
}

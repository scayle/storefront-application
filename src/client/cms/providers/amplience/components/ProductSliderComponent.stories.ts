import { computed } from 'vue'
import type { ProductSliderComponent as ProductSliderComponentType } from '@shared/types/cms/amplience'
import ProductSliderComponent from './ProductSliderComponent.vue'

interface ProductSliderStoryArgs {
  headline?: string
  productIds: number[]
}

const createContentElement = (
  headline: string | undefined,
  productIds: number[],
): ProductSliderComponentType =>
  ({
    headline,
    product_ids: productIds,
    _meta: {
      schema: 'https://scayle.com/schemas/product-slider-component.json',
    },
  }) as unknown as ProductSliderComponentType

/**
 * Amplience Product Slider component shows a horizontal carousel of hand-picked
 * products. Amplience stores the selection as a plain array of SCAYLE product IDs,
 * and the component restores that authored order after fetching, since the
 * products endpoint returns matches in its own order.
 */
export default {
  title: 'CMS Amplience/ProductSlider',
  component: ProductSliderComponent,
  argTypes: {
    headline: {
      control: 'text',
      description: 'Optional headline displayed above the slider',
      name: 'contentElement.headline',
    },
    productIds: {
      control: 'object',
      description: 'SCAYLE product IDs to fetch and display, in authored order',
      name: 'contentElement.product_ids',
    },
  },
  parameters: {
    docs: {
      source: {
        code: '<ProductSliderComponent :content-element="contentElement" />',
      },
    },
  },
  render: (args: ProductSliderStoryArgs) => ({
    components: { ProductSliderComponent },
    setup() {
      const contentElement = computed(() =>
        createContentElement(args.headline, args.productIds),
      )
      return { contentElement }
    },
    template:
      '<Suspense><ProductSliderComponent :content-element="contentElement" /></Suspense>',
  }),
}

/** Curated selection with a headline */
export const Default = {
  args: {
    headline: 'Featured products',
    productIds: [1, 2, 3, 4, 5, 6],
  },
}

/** Without a headline, the slider sits flush with the block above it */
export const WithoutHeadline = {
  args: {
    productIds: [1, 2, 3, 4, 5],
  },
}

/** A short selection, where the slider has little to scroll */
export const FewProducts = {
  args: {
    headline: 'Back in stock',
    productIds: [1, 2],
  },
}

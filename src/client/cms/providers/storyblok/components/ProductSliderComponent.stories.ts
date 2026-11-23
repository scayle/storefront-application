import { computed } from 'vue'
import type { ProductSliderComponent as ProductSliderComponentType } from '@shared/types/cms/storyblok'
import ProductSliderComponent from './ProductSliderComponent.vue'

interface ProductSliderStoryArgs {
  title?: string
  products?: Array<{ id: number }>
}

const createContentElement = (
  title?: string,
  products: Array<{ id: number }> = [
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
    { id: 5 },
  ],
): ProductSliderComponentType => ({
  _uid: 'product-slider-1',
  component: 'ProductSliderComponent',
  title,
  products,
})

/**
 * Storyblok Product Slider component displays a horizontal carousel of products with navigation controls.
 * It fetches products by their IDs and renders them using the SFProductSlider with customizable title display.
 */
export default {
  title: 'CMS Storyblok/ProductSlider',
  component: ProductSliderComponent,
  argTypes: {
    title: {
      control: 'text',
      description: 'Optional title displayed above the product slider',
      name: 'contentElement.title',
    },
    products: {
      control: 'object',
      description:
        'Array of product objects with ID references to fetch and display',
      name: 'contentElement.products',
    },
  },
  parameters: {
    docs: {
      source: {
        code: `
          <template>
            <ProductSliderComponent :contentElement="contentElement" />
          </template>
        `,
      },
    },
  },
  render: (args: ProductSliderStoryArgs) => ({
    components: { ProductSliderComponent },
    setup() {
      const contentElement = computed(() =>
        createContentElement(args.title, args.products),
      )
      return { contentElement }
    },
    template:
      '<Suspense><ProductSliderComponent :content-element="contentElement" /></Suspense>',
  }),
}

/** Default product slider with title and sample product IDs */
export const Default = {
  args: {
    title: 'Featured Products',
    products: [
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
      { id: 6 },
    ],
  },
}

/** Product slider without a title, showing products only */
export const WithoutTitle = {
  args: {
    products: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
  },
}

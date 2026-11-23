import { computed } from 'vue'
import type { RecentlyViewedProductsComponent as RecentlyViewedProductsComponentType } from '@shared/types/cms/amplience'
import RecentlyViewedProductsComponent from './RecentlyViewedProductsComponent.vue'

const createContentElement = (
  padding?: string,
): RecentlyViewedProductsComponentType =>
  ({
    padding,
    _meta: {
      schema:
        'https://scayle.com/schemas/recently-viewed-products-component.json',
    },
  }) as unknown as RecentlyViewedProductsComponentType

/**
 * Amplience Recently Viewed Products component shows the products the current user
 * has already looked at. The list comes from localStorage rather than the CMS, so
 * the only authored setting is the padding around the slider.
 *
 * The stories seed localStorage with sample product IDs so the global RPC mock can
 * return product data.
 *
 * @see {@link ../../../../../../components/product/slider/SFProductSlider.stories.ts} - Base component story with detailed examples
 */
export default {
  title: 'CMS Amplience/RecentlyViewedProducts',
  component: RecentlyViewedProductsComponent,
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'small', 'medium', 'large'],
      description: 'Amount of space around the component',
      name: 'contentElement.padding',
    },
  },
  render: (args: { padding?: string }) => ({
    components: { RecentlyViewedProductsComponent },
    setup() {
      localStorage.setItem(
        '1-recently-viewed-products',
        JSON.stringify([1, 2, 3, 4, 5]),
      )
      const contentElement = computed(() => createContentElement(args.padding))
      return { contentElement }
    },
    template:
      '<RecentlyViewedProductsComponent :content-element="contentElement" />',
  }),
}

/** Flush with the surrounding blocks */
export const Default = {
  args: { padding: 'none' },
}

export const MediumPadding = {
  args: { padding: 'medium' },
}

export const LargePadding = {
  args: { padding: 'large' },
}

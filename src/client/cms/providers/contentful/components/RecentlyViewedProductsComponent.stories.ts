import { computed } from 'vue'
import type { TypeRecentlyViewedProductsComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import RecentlyViewedProductsComponentVue from './RecentlyViewedProductsComponent.vue'

const createContentElement = (
  padding?: string,
): TypeRecentlyViewedProductsComponentWithoutUnresolvableLinksResponse =>
  ({
    sys: {
      id: 'recently-viewed-1',
      type: 'Entry',
      contentType: {
        sys: {
          id: 'RecentlyViewedProductsComponent',
          type: 'Link',
          linkType: 'ContentType',
        },
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      locale: 'en-US',
      revision: 1,
    },
    fields: {
      padding,
    },
    metadata: {
      tags: [],
      concepts: [],
    },
  }) as unknown as TypeRecentlyViewedProductsComponentWithoutUnresolvableLinksResponse

/**
 * Contentful Recently Viewed Products component displays products the user
 * has previously viewed using the useRecentlyViewedProducts composable.
 * The padding around the slider is configurable via the CMS.
 *
 * This component wraps SFProductSlider. Products are loaded from localStorage
 * via `useRecentlyViewedProducts`. The stories seed localStorage with sample
 * product IDs so the global RPC mock can return mock product data.
 *
 * @see {@link ../../../../../../components/product/slider/SFProductSlider.stories.ts} - Base component story with detailed examples
 */
export default {
  title: 'CMS Contentful/RecentlyViewedProducts',
  component: RecentlyViewedProductsComponentVue,
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'small', 'medium', 'large'],
      description: 'Amount of space around the component',
    },
  },
  render: (args: { padding?: string }) => ({
    components: { RecentlyViewedProductsComponentVue },
    setup() {
      localStorage.setItem(
        '1-recently-viewed-products',
        JSON.stringify([1, 2, 3, 4, 5]),
      )
      const contentElement = computed(() => createContentElement(args.padding))
      return { contentElement }
    },
    template:
      '<RecentlyViewedProductsComponentVue :content-element="contentElement" />',
  }),
}

/** Default without padding */
export const Default = {
  args: {
    padding: 'none',
  },
}

/** With medium padding */
export const MediumPadding = {
  args: {
    padding: 'medium',
  },
}

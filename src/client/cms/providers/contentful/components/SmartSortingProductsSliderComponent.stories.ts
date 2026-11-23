import { computed } from 'vue'
import SFProductSkeletonSlider from '@client/components/product/slider/SFProductSkeletonSlider.vue'
import type { TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import SmartSortingProductsSliderComponent from './SmartSortingProductsSliderComponent.vue'

interface SmartSortingProductsSliderStoryArgs {
  title?: string
  smartSortingKey?: TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse['fields']['smartSortingKey']
  brandId?: number
  categoryId?: number
  limit?: number
}

const createContentElement = (
  fields: Partial<SmartSortingProductsSliderStoryArgs> = {},
): TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse => {
  const definedFields = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value != null),
  ) as Partial<SmartSortingProductsSliderStoryArgs>

  return {
    sys: {
      id: 'smart-sorting-slider-basic',
      type: 'Entry',
      contentType: {
        sys: {
          id: 'smartSortingProductsSliderComponent',
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
      title: 'Featured Products',
      smartSortingKey: 'Topseller',
      limit: 10,
      ...definedFields,
    },
    metadata: {
      tags: [],
      concepts: [],
    },
  } as unknown as TypeSmartSortingProductsSliderComponentWithoutUnresolvableLinksResponse
}

/**
 * Contentful Smart Sorting Product Slider displays a horizontal carousel of products
 * selected and sorted by a SCAYLE smart sorting algorithm, with an optional title.
 */
export default {
  title: 'CMS Contentful/SmartSortingProductsSlider',
  component: SmartSortingProductsSliderComponent,
  argTypes: {
    title: {
      control: 'text',
      description: 'Optional title displayed above the product slider',
      name: 'contentElement.fields.title',
    },
    smartSortingKey: {
      control: 'select',
      options: [
        'Sales Push',
        'New Arrivals',
        'Balanced Offerings',
        'Inventory Optimization',
        'Luxury Promotion',
        'Stock Coverage',
        'Topseller',
        'Revenue Max',
        'Recently Popular',
        'Trending',
      ],
      description:
        'Smart sorting algorithm label mapped to a SCAYLE sorting key',
      name: 'contentElement.fields.smartSortingKey',
    },
    brandId: {
      control: 'number',
      description: 'Optional brand ID to limit products',
      name: 'contentElement.fields.brandId',
    },
    categoryId: {
      control: 'number',
      description: 'Optional category ID to limit products',
      name: 'contentElement.fields.categoryId',
    },
    limit: {
      control: 'number',
      description: 'Maximum number of products to display',
      name: 'contentElement.fields.limit',
    },
  },
  args: {
    title: 'Featured Products',
    smartSortingKey: 'Topseller',
    limit: 10,
  },
  parameters: {
    docs: {
      story: {
        height: '360px',
      },
      source: {
        code: `
          <template>
            <SmartSortingProductsSliderComponent :contentElement="contentElement" />
          </template>
        `,
      },
    },
  },
  render: (args: SmartSortingProductsSliderStoryArgs) => ({
    components: {
      SmartSortingProductsSliderComponent,
      SFProductSkeletonSlider,
    },
    setup() {
      const contentElement = computed(() => createContentElement(args))
      return { contentElement }
    },
    template: `
      <Suspense>
        <SmartSortingProductsSliderComponent :content-element="contentElement" />
        <template #fallback>
          <SFProductSkeletonSlider class="w-full" />
        </template>
      </Suspense>
    `,
  }),
}

/** Default smart sorting slider with title and topseller algorithm */
export const Default = {
  args: {
    title: 'Featured Products',
    smartSortingKey: 'Topseller',
    limit: 10,
  },
}

/** Smart sorting slider without a title */
export const WithoutTitle = {
  args: {
    title: undefined,
    smartSortingKey: 'New Arrivals',
    limit: 8,
  },
}
